'use strict'

var SimpleEvents = require('@elishacook/simple-events')

var computation = new SimpleEvents()
computation.start = computation.emit.bind(computation, 'start')
computation.end = computation.emit.bind(computation, 'end')
computation.async = computation.emit.bind(computation, 'async')
computation.remove_all_listeners = function ()
{
    computation.off('start')
    computation.off('end')
    computation.off('async')
}

module.exports = computation