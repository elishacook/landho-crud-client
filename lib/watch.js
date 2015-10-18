"use strict"

function Watcher ()
{
    this.watched = []
}

Watcher.prototype.push = function (watcher)
{
    this.watched.push(watcher)
}

Watcher.prototype.stop = function ()
{
    this.watched.forEach(function (w)
    {
        w.close()
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
    return x
}

watch.watcher = null

module.exports = watch