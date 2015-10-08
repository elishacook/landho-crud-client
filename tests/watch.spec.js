'use strict'

var watch = require('../lib/watch'),
    make_feed = function ()
    {
        return {
            increment: sinon.spy(),
            decrement: sinon.spy()
        }
    }

describe('watch', function ()
{
    it('collects feeds pushed during a call', function ()
    {
        expect(watch.watcher).to.be.null
        
        var a = make_feed(),
            b = make_feed()
        
        var watcher = watch(function ()
        {
            watch.watcher.push(a)
            watch.watcher.push(b)
        })
        
        expect(watcher.feeds).to.deep.equal([a, b])
    })
    
    it('increments feeds when starting', function ()
    {
        var feed = make_feed()
        var watcher = watch(function ()
        {
            watch.watcher.push(feed)
        })
        
        expect(feed.increment).to.have.been.calledOnce
    })
    
    it('decrements feeds when stopping', function ()
    {
        var feed = make_feed()
        var watcher = watch(function ()
        {
            watch.watcher.push(feed)
        })
        
        watcher.stop()
        expect(feed.decrement).to.have.been.calledOnce
    })
    
    it('does not decrement more than once if stop() is called multiple times', function ()
    {
        var feed = make_feed()
        var watcher = watch(function ()
        {
            watch.watcher.push(feed)
        })
        
        watcher.stop()
        watcher.stop()
        watcher.stop()
        
        expect(feed.decrement).to.have.been.calledOnce
    })
    
    it('creates multiple watchers for multiple calls to watch()', function ()
    {
        var a = make_feed(),
            b = make_feed(),
            watcher_a = watch(function ()
            {
                watch.watcher.push(a)
            }),
            watcher_b = watch(function ()
            {
                watch.watcher.push(b)
            })
        
        expect(watcher_a).to.not.equal(watcher_b)
        expect(watcher_a.feeds).to.deep.equal([a])
        expect(watcher_b.feeds).to.deep.equal([b])
    })
})