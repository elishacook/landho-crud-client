"use strict"

function Watcher ()
{
    this.running = false
    this.feeds = []
}

Watcher.prototype.push = function (watcher)
{
    if (this.feeds.indexOf(watcher) < 0)
    {
        this.feeds.push(watcher)
    }
}

Watcher.prototype.start = function ()
{
    if (this.running)
    {
        return
    }
    
    this.running = true
    this.feeds.forEach(function (w)
    {
        w.increment()
    })
}

Watcher.prototype.stop = function ()
{
    if (!this.running)
    {
        return
    }
    
    this.running = false
    
    this.feeds.forEach(function (w)
    {
        w.decrement()
    })
}

var watch = function (fn)
{
    if (!watch.watcher)
    {
        watch.watcher = new Watcher()
    }
    
    try
    {
        fn()
    }
    catch (e)
    {
        watch.watcher = null
        throw e
    }
    
    var x = watch.watcher
    watch.watcher = null
    x.start()
    return x
}

watch.watcher = null

module.exports = watch