.PHONY: *

NODEJS_VERSION := $(shell cat .nvmrc)
POSTGRESQL_VERSION := 10
DOCKER_RUN := docker run --rm --volume ${PWD}:/code --workdir /code --user node node:$(NODEJS_VERSION)

TEST_NETWORK := sdk_test

# this is fine as long as we invoke the tests after start-test-app
LISK_ADDRESS=$(shell docker run --rm --network $(TEST_NETWORK) --user node node:$(NODEJS_VERSION) getent hosts test-app |cut -d " " -f 1)

all: build lint test-elements test-commander test-framework

debug:
	@echo $(LISK_ADDRESS)

build:
	$(DOCKER_RUN) npm ci
	$(DOCKER_RUN) npm run bootstrap -- --ci
	$(DOCKER_RUN) npm run build

# needed by one of the "Functional HTTP GET tests"
framework/REVISION:
	git rev-parse HEAD > framework/REVISION

lint:
	$(DOCKER_RUN) npm run lint

test-elements:
	$(DOCKER_RUN) npx lerna run test --ignore lisk-{framework,commander}
	# TODO: collect coverage results

commander/.env:
	echo LISK_COMMANDER_CONFIG_DIR=/code/.lisk >commander/.env

test-commander: commander/.env
	docker run --rm --volume ${PWD}:/code --workdir /code/commander --user node --env-file commander/.env node:$(NODEJS_VERSION) npm test
	# TODO: collect coverage results

test-framework:
	docker run --rm --volume ${PWD}:/code --workdir /code/framework --user node node:$(NODEJS_VERSION) npm run jest:unit
	#docker run --rm --volume ${PWD}:/code --workdir /code/framework --user node node:$(NODEJS_VERSION) npm run jest:integration  # database host hardcoded?
	docker run --rm --volume ${PWD}:/code --workdir /code/framework --user node node:$(NODEJS_VERSION) npm run jest:functional
	# TODO: collect coverage results and log files

start-test-app: clean-test-app
	docker network create $(TEST_NETWORK)
	docker run --detach --network $(TEST_NETWORK) --name redis redis
	docker run --detach --network $(TEST_NETWORK) --name postgresql --env POSTGRES_DB=lisk --env POSTGRES_PASSWORD=password --env POSTGRES_USER=lisk postgres:10
	echo NODE_ENV=test >.env
	echo LISK_CONSOLE_LOG_LEVEL=debug >>.env
	echo LISK_DB_HOST=postgresql >>.env
	echo LISK_DB_NAME=lisk >>.env
	echo LISK_DB_USER=lisk >>.env
	echo LISK_DB_PASSWORD=password >>.env
	echo LISK_REDIS_HOST=redis >>.env
	echo LISK_REDIS_PORT=6379 >>.env
	echo -n LISK_FORGING_WHITELIST= >>.env
	docker network inspect --format '{{ (index .IPAM.Config 0).Subnet }}' $(TEST_NETWORK) >>.env
	sleep 10
	docker run --detach --network $(TEST_NETWORK) --name test-app --rm --volume ${PWD}:/code --workdir /code/framework --user node --env-file .env node:$(NODEJS_VERSION) node test/test_app

test-framework-legacy-functional-%: framework/REVISION
	docker run --rm --network $(TEST_NETWORK) --volume ${PWD}:/code --workdir /code/framework --user node --env-file .env \
		--env LISK_ADDRESS=$(LISK_ADDRESS) --env MAX_TASK_LIMIT=10 \
		node:$(NODEJS_VERSION) npm run mocha:functional:$* -- --grep '@slow|@unstable' --invert

setup-unit-integration: clean-unit-integration
	docker network create test_network
	docker run --detach --network test_network --name redis-test redis
	docker run --detach --network test_network --name postgresql-test --env POSTGRES_DB=lisk --env POSTGRES_PASSWORD=password --env POSTGRES_USER=lisk postgres:$(POSTGRESQL_VERSION)
	sleep 10

test-framework-legacy-%: setup-unit-integration
	docker run --rm --network test_network --volume ${PWD}:/code --workdir /code/framework \
		--env NODE_ENV=test --env MAX_TASK_LIMIT=10 \
		--env LISK_REDIS_HOST=redis-test --env LISK_REDIS_PORT=6379 \
		--env LISK_DB_HOST=postgresql-test --env LISK_DB_NAME=lisk --env LISK_DB_USER=lisk --env LISK_DB_PASSWORD=password \
		--env PATH=/code/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
		--user node patched_node:$(NODEJS_VERSION) npm run mocha:$* -- --grep '@slow|@unstable' --invert

#test-framework-legacy: test-framework-legacy-functional-get test-framework-legacy-functional-post test-framework-legacy-functional-put test-framework-legacy-functional-ws test-framework-legacy-unit test-framework-legacy-integration
test-framework-legacy: test-framework-legacy-functional-post test-framework-legacy-functional-put test-framework-legacy-unit test-framework-legacy-integration

# TODO: post

stop-test-app:
	docker rm -f test-app || true

clean-test-app: stop-test-app
	docker rm --volumes --force postgresql redis || true
	docker network remove $(TEST_NETWORK) || true

clean-unit-integration:
	docker rm --volumes --force postgresql-test redis-test || true
	docker network remove test_network || true

clean: clean-test-app clean-unit-integration
