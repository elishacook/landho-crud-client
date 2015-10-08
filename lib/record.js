'use strict'

module.exports = Record


function Record (fields, backup_fields, methods, relations)
{
    if (backup_fields)
    {
        Object.keys(backup_fields).forEach(function (k)
        {
            this[k] = backup_fields[k]
        }.bind(this))
    }
    
    if (fields)
    {
        Object.keys(fields).forEach(function (k)
        {
            this[k] = fields[k]
        }.bind(this))
    }
    
    Object.defineProperty(this, 'deleted',
    {
        enumerable: false,
        value: false,
        writable: true
    })
    
    Object.defineProperty(this, 'error',
    {
        enumerable: false,
        value: null,
        writable: true
    })
    
    Object.defineProperty(this, 'serialize',
    {
        enumerable: false,
        value: function ()
        {
            return JSON.parse(JSON.stringify(this))
        }
    })
    
    Object.defineProperty(this, 'update',
    {
        enumerable: false,
        value: function (fields)
        {
            Object.keys(fields).forEach(function (k)
            {
                this[k] = fields[k]
            }.bind(this))
        }
    })
    
    Object.defineProperty(this, 'property',
    {
        enumerable: false,
        value: function (key)
        {
            return function (x)
            {
                if (x !== undefined)
                {
                    this[key] = x
                }
                else
                {
                    return this[key]
                }
            }.bind(this)
        }
    })
    
    if (methods)
    {
        Object.keys(methods).forEach(function (k)
        {
            Object.defineProperty(this, k,
            {
                enumerable: false,
                value: methods[k]
            })
        }.bind(this))
    }
    
    if (relations)
    {
        Object.keys(relations).forEach(function (k)
        {
            Object.defineProperty(this, k,
            {
                enumerable: false,
                get: relations[k]
            })
        }.bind(this))
    }
}