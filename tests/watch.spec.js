'use strict'

var watch = require('../lib/watch'),
    make_watched = function ()
    {
        return {
            increment: sinon.spy(),
            decrement: sinon.spy()
        }
    }

describe('watch', function ()
{
    it('collects watched pushed during a call', function ()
    {
        expect(watch.watcher).to.be.null
        
        var a = make_watched(),
            b = make_watched()
        
        var watcher = watch(function ()
        {
            watch.watcher.push(a)
            watch.watcher.push(b)
        })
        
        expect(watcher.watched).to.deep.equal([a, b])
    })
    
    it('increments watched when starting', function ()
    {
        var watched = make_watched()
        var watcher = watch(function ()
        {
            watch.watcher.push(watched)
        })
        
        expect(watched.increment).to.have.been.calledOnce
    })
    
    it('decrements watched when stopping', function ()
    {
        var watched = make_watched()
        var watcher = watch(function ()
        {
            watch.watcher.push(watched)
        })
        
        watcher.stop()
        expect(watched.decrement).to.have.been.calledOnce
    })
    
    it('does not decrement more than once if stop() is called multiple times', function ()
    {
        var watched = make_watched()
        var watcher = watch(function ()
        {
            watch.watcher.push(watched)
        })
        
        watcher.stop()
        watcher.stop()
        watcher.stop()
        
        expect(watched.decrement).to.have.been.calledOnce
    })
    
    it('creates multiple watchers for multiple calls to watch()', function ()
    {
        var a = make_watched(),
            b = make_watched(),
            watcher_a = watch(function ()
            {
                watch.watcher.push(a)
            }),
            watcher_b = watch(function ()
            {
                watch.watcher.push(b)
            })
        
        expect(watcher_a).to.not.equal(watcher_b)
        expect(watcher_a.watched).to.deep.equal([a])
        expect(watcher_b.watched).to.deep.equal([b])
    })
})