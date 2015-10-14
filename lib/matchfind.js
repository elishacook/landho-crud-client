'use strict'

/*
Check if an object matches a find() query using the same
semantics as landho-crud
*/

module.exports = function (fields, options)
{
    if (options.start || options.end)
    {
        return between(fields, options)
    }
    else
    {
        return equals(fields, options)
    }
}


function between (fields, options)
{
    if (!options.index)
    {
        throw new Error('missing index')
    }
    
    var keys = get_keys_from_index(options.index),
        value,
        start = null,
        end = null
        
    if (keys.length > 1)
    {
        value = get_value(keys.map(function (k)
        {
            return fields[k]
        }))
    }
    else
    {
        value = get_value(fields[keys[0]])
    }
    
    if (options.start !== undefined)
    {
        start = get_value(options.start)
    }
    
    if (options.end !== undefined)
    {
        end = get_value(options.end)
    }
    
    var match = true
    
    if (start)
    {
        if (options.left == 'open')
        {
            match = start < value
        }
        else
        {
            match = start <= value
        }
    }
    
    if (end)
    {
        if (options.right == 'closed')
        {
            match = match && value <= end
        }
        else
        {
            match = match && value < end
        }
    }
    
    return match
}


function equals (fields, options)
{
    if (options.index !== undefined && options.value !== undefined)
    {
        var keys = get_keys_from_index(options.index)
        
        if (keys.length == 1)
        {
            return get_value(fields[keys[0]]) === get_value(options.value)
        }
        else
        {
            return keys.every(function (k, i)
            {
                return get_value(fields[k]) === get_value(options.value[i])
            })
        }
    }
    else
    {
        return true
    }
}


function get_keys_from_index (index)
{
    return index.split('$')
}


function get_value(v)
{
    if (v instanceof Array)
    {
        return v.map(function (x)
        {
            return JSON.stringify(get_value(x))
        }).join('')
    }
    
    if (v instanceof Date)
    {
        return v.getTime()
    }
    else
    {
        return v
    }
}
