'use strict'

var chai = require('chai')
chai.config.includeStack = true
global.expect = chai.expect

global.sinon = require('sinon')
var sinon_chai = require('sinon-chai')
chai.use(sinon_chai)