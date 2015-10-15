'use strict'

module.exports = 
{
    HasMany: function (target_collection, target_field, source_field)
    {
        var source_field = source_field || 'id'
        
        return function (options)
        {
            var options = options || {}
            options.index = target_field
            options.value = this[source_field]
            
            return target_collection.find(options)
        }
    }
}