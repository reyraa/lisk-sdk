const assert = require('assert');
const randomstring = require('randomstring');
const _ = require('lodash');
const Controller = require('./controller');
const version = require('../version');
const validator = require('./helpers/validator');
const applicationSchema = require('./schema/application');
const constantsSchema = require('./schema/constants');
const { createLoggerComponent } = require('../components/logger');

const ChainModule = require('../modules/chain');
const HttpAPIModule = require('../modules/http_api');

// Private __private used because private keyword is restricted
const __private = {
	modules: new WeakMap(),
	transactions: new WeakMap(),
};

const registerProcessHooks = app => {
	process.title = `${app.label}`;

	process.on('uncaughtException', err => {
		// Handle error safely
		app.logger.error('System error: uncaughtException :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1, err.message);
	});

	process.on('unhandledRejection', err => {
		// Handle error safely
		app.logger.fatal('System error: unhandledRejection :', {
			message: err.message,
			stack: err.stack,
		});
		app.shutdown(1, err.message);
	});

	process.once('SIGTERM', () => app.shutdown(1));

	process.once('SIGINT', () => app.shutdown(1));

	process.once('cleanup', (error, code) => app.shutdown(code, error));

	process.once('exit', (error, code) => app.shutdown(code, error));
};

/**
 * Application class to start the block chain instance
 *
 * @class
 * @memberof framework.controller
 * @requires assert
 * @requires Controller
 * @requires module.defaults
 * @requires helpers/validator
 * @requires schema/application
 * @requires components/logger
 * @requires components/storage
 */
class Application {
	/**
	 * Create the application object
	 *
	 * @example
	 *    const app = new Application('my-app-devnet', myGenesisBlock)
	 * @example
	 *    const app = new Application('my-app-devnet', myGenesisBlock, myConstants)
	 *
	 * @param {string|function} label - Application label used in logs. Useful if you have multiple networks for same application.
	 * @param {Object} genesisBlock - Genesis block object
	 * @param {Object} [constants] - Override constants
	 * @param {Object|Array.<Object>} [config] - Main configuration object or the array of objects, array format will facilitate user to not deep merge the objects
	 * @param {Object} [config.components] - Configurations for components
	 * @param {Object} [config.components.logger] - Configuration for logger component
	 * @param {Object} [config.components.cache] - Configuration for cache component
	 * @param {Object} [config.components.storage] - Configuration for storage component
	 * @param {Object} [config.initialState] - Configuration for applicationState
	 * @param {Object} [config.modules] - Configurations for modules
	 * @param {string} [config.version] - Version of the application
	 * @param {string} [config.minVersion] - Minimum compatible version on the network
	 * @param {string} [config.protocolVersion] - Compatible protocol version application is using
	 *
	 * @throws Framework.errors.SchemaValidationError
	 */
	constructor(
		label,
		genesisBlock,
		constants = {},
		config = { components: { logger: null }, modules: {} }
	) {
		let appConfig;

		// If user passes multiple config objects merge them in left-right order
		if (Array.isArray(config)) {
			appConfig = _.mergeWith(
				{ components: {}, modules: {} },
				...config,
				(objValue, srcValue) => {
					if (_.isArray(objValue)) {
						return srcValue;
					}
					return undefined;
				}
			);
		} else {
			appConfig = config;
		}

		const appLabel =
			typeof label === 'function' ? label.call(null, appConfig) : label;

		if (!appConfig.components.logger) {
			appConfig.components.logger = {
				logFileName: `${process.cwd()}/logs/${appLabel}/lisk.log`,
			};
		}

		validator.loadSchema(applicationSchema);
		validator.loadSchema(constantsSchema);
		validator.validate(applicationSchema.appLabel, appLabel);
		validator.validate(applicationSchema.config, appConfig);
		constants = validator.validateWithDefaults(
			constantsSchema.constants,
			constants
		);

		validator.validate(applicationSchema.genesisBlock, genesisBlock);

		// TODO: Validate schema for genesis block, constants, exceptions
		this.genesisBlock = genesisBlock;
		this.constants = constants;
		this.label = appLabel;
		this.config = appConfig;
		this.controller = null;

		this.logger = createLoggerComponent(this.config.components.logger);

		__private.modules.set(this, {});
		__private.transactions.set(this, {});

		this.registerModule(ChainModule);
		this.registerModule(HttpAPIModule);
		this.overrideModuleOptions(HttpAPIModule.alias, {
			loadAsChildProcess: true,
		});
	}

	/**
	 * Register module with the application
	 *
	 * @param {Object} moduleKlass - Module specification
	 *  @see {@link '../modules/README.md'}
	 * @param {Object} [options] - Modules configuration object. Provided options will override `moduleKlass.defaults` to generate final configuration used for the module
	 * @param {string} [alias] - Will use this alias or fallback to `moduleKlass.alias`
	 */
	registerModule(moduleKlass, options = {}, alias = undefined) {
		assert(moduleKlass, 'ModuleSpec is required');
		assert(
			typeof options === 'object',
			'Module options must be provided or set to empty object.'
		);
		assert(alias || moduleKlass.alias, 'Module alias must be provided.');
		const moduleAlias = alias || moduleKlass.alias;
		assert(
			!Object.keys(this.getModules()).includes(moduleAlias),
			`A module with alias "${moduleAlias}" already registered.`
		);

		const modules = this.getModules();
		modules[moduleAlias] = moduleKlass;
		this.config.modules[moduleAlias] = Object.assign(
			this.config.modules[moduleAlias] || {},
			options
		);
		__private.modules.set(this, modules);
	}

	/**
	 * Override the module's configuration
	 *
	 * @param {string} alias - Alias of module used during registration
	 * @param {Object} options - Override configurations, these will override existing configurations.
	 */
	overrideModuleOptions(alias, options) {
		const modules = this.getModules();
		assert(
			Object.keys(modules).includes(alias),
			`No module ${alias} is registered`
		);
		this.config.modules[alias] = Object.assign(
			{},
			this.config.modules[alias],
			options
		);
	}

	/**
	 * Register a transaction
	 *
	 * @param {constructor} Transaction - Transaction class
	 * @param {string} alias - Will use this alias or fallback to `Transaction.alias`
	 */
	registerTransaction(Transaction, alias) {
		assert(Transaction, 'Transaction is required');
		assert(alias, 'Transaction is required');
		assert(
			typeof Transaction === 'function',
			'Transaction should be constructor'
		);
		// TODO: Validate the transaction is properly inherited from base class
		assert(
			!Object.keys(this.getTransactions()).includes(alias),
			`A transaction with alias "${alias}" already registered.`
		);

		const transactions = this.getTransactions();
		transactions[alias] = Object.freeze(Transaction);
		__private.transactions.set(this, transactions);
	}

	/**
	 * Get list of all transactions registered with the application
	 *
	 * @return {Object}
	 */
	getTransactions() {
		return __private.transactions.get(this);
	}

	/**
	 * Get one transaction for provided alias
	 *
	 * @param {string} alias - Alias for transaction used during registration
	 * @return {constructor|undefined}
	 */
	getTransaction(alias) {
		return __private.transactions.get(this)[alias];
	}

	/**
	 * Get one module for provided alias
	 *
	 * @param {string} alias - Alias for module used during registration
	 * @return {{klass: Object, options: Object}}
	 */
	getModule(alias) {
		return __private.modules.get(this)[alias];
	}

	/**
	 * Get all registered modules
	 *
	 * @return {Array.<Object>}
	 */
	getModules() {
		return __private.modules.get(this);
	}

	/**
	 * Run the application
	 *
	 * @async
	 * @return {Promise.<void>}
	 */
	async run() {
		this.logger.info(`Booting the application with Lisk Framework(${version})`);

		// Freeze every module and configuration so it would not interrupt the app execution
		this._compileAndValidateConfigurations();

		// Check if label is a function, then call that function to get the label
		// This is because user can pass a function generator function instead of string
		if (typeof this.label === 'function') {
			this.label = this.label.call(this, this.config);
		}
		validator.validate(applicationSchema.appLabel, this.label);

		Object.freeze(this.genesisBlock);
		Object.freeze(this.constants);
		Object.freeze(this.label);
		Object.freeze(this.config);

		this.logger.info(`Starting the app - ${this.label || 'LiskApp'}`);

		registerProcessHooks(this);

		this.controller = new Controller(
			this.label,
			{
				components: this.config.components,
				ipc: this.config.ipc,
				initialState: this.config.initialState,
			},
			this.logger
		);
		return this.controller.load(this.getModules(), this.config.modules);
	}

	/**
	 * Stop the running application
	 *
	 * @param {number} [errorCode=0] - Error code
	 * @param {string} [message] - Message specifying exit reason
	 * @return {Promise.<void>}
	 */
	async shutdown(errorCode = 0, message = '') {
		if (this.controller) {
			await this.controller.cleanup(errorCode, message);
		}
		this.logger.log(`Shutting down with error code ${errorCode}: ${message}`);
		process.exit(errorCode);
	}

	_compileAndValidateConfigurations() {
		const modules = this.getModules();

		const sharedConfiguration = {
			version: this.config.version,
			minVersion: this.config.minVersion,
			protocolVersion: this.config.protocolVersion,
			nonce: randomstring.generate(16),
			nethash: this.genesisBlock.payloadHash,
		};

		// TODO: move this configuration to module especific config file
		const childProcessModules = process.env.LISK_CHILD_PROCESS_MODULES
			? process.env.LISK_CHILD_PROCESS_MODULES.split(',')
			: ['httpApi'];

		Object.keys(modules).forEach(alias => {
			this.logger.info(`Validating module options with alias: ${alias}`);
			this.config.modules[alias] = validator.validateWithDefaults(
				modules[alias].defaults,
				this.config.modules[alias]
			);

			this.overrideModuleOptions(alias, sharedConfiguration);
			this.overrideModuleOptions(alias, {
				genesisBlock: this.genesisBlock,
				constants: this.constants,
				loadAsChildProcess: childProcessModules.includes(alias),
			});
		});

		// TODO: Improve the hardcoded system component values
		this.config.components.system = {
			...sharedConfiguration,
			wsPort: this.config.modules.chain.network.wsPort,
			httpPort: this.config.modules.http_api.httpPort,
		};

		this.config.initialState = {
			nethash: this.config.nethash,
			version: this.config.version,
			wsPort: this.config.modules.chain.network.wsPort,
			httpPort: this.config.modules.http_api.httpPort,
			minVersion: this.config.minVersion,
			protocolVersion: this.config.protocolVersion,
			nonce: this.config.nonce,
		};

		this.logger.trace('Compiled configurations', this.config);
	}
}

module.exports = Application;
