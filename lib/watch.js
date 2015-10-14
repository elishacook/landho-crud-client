"use strict"

function Watcher ()
{
    this.running = false
    this.watched = []
}

Watcher.prototype.push = function (watcher)
{
    if (this.watched.indexOf(watcher) < 0)
    {
        this.watched.push(watcher)
    }
}

Watcher.prototype.start = function ()
{
    if (this.running)
    {
        return
    }
    
    this.running = true
    this.watched.forEach(function (w)
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
    
    this.watched.forEach(function (w)
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
watch.Watched = function ()
{
    this.references = 0
}

watch.Watched.prototype.increment = function ()
{
    this.references++
    
    if (this.references == 1)
    {
        this.start()
    }
}

watch.Watched.prototype.decrement = function ()
{
    this.references--
    
    if (this.references == 0)
    {
        this.stop()
    }
}

watch.Watched.prototype.start = watch.Watched.prototype.stop = function () {}

module.exports = watch