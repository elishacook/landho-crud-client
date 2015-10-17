'use strict'

var computation = require('../lib/computation')

describe('computation', function ()
{
    afterEach(function ()
    {
        computation.remove_all_listeners()
    })
    
    it('has a start method that emits the start event', function ()
    {
        var start = sinon.stub()
        computation.on('start', start)
        computation.start()
        expect(start).to.have.been.calledOnce
    })
    
    it('has a end method that emits the end event', function ()
    {
        var end = sinon.stub()
        computation.on('end', end)
        computation.end()
        expect(end).to.have.been.calledOnce
    })
    
    it('has an async method that emits the async event', function ()
    {
        var async = sinon.stub()
        computation.on('async', async)
        computation.async()
        expect(async).to.have.been.calledOnce
    })
})