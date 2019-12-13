@Library('lisk-jenkins') _

pipeline {
	agent { node { label 'docker' } }

	stages {
		stage('Cancel previous build') {
			steps {
				script {
					if (env.CHANGE_ID) {
						// we are building a pull request, try cancelling previous build
						cancelPreviousBuild()
					}
				}
			}
		}
		stage('Build') {
			steps {
				sh 'make'
			}
		}
		stage('Tests') {
			steps {
				ansiColor('xterm') {
					sh '''#!/bin/bash -xe
					make start-test-app
					sleep 10
					make test-framework-legacy
					make stop-test-app
					'''
				}
			}
		}
	}
	post {
		failure {
			sh 'docker logs test-app'
		}
		cleanup {
			sh 'make clean'
		}
	}
}
// vim: filetype=groovy
