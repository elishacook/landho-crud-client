'use strict'

var mixin = function (object, mixin)
{
    Object.keys(mixin).forEach(function (k)
    {
        object.prototype[k] = mixin[k]
    })
}

// not scientific
mixin.has = function (object, mixin)
{
    return Object.keys(mixin).some(function (k)
    {
        return object[k] === mixin[k]
    })
}

module.exports = mixin