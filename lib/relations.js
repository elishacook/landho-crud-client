'use strict'

module.exports = 
{
    HasOne: function (target_field, collection)
    {
        return function ()
        {
            var id = this[target_field]
            if (id)
            {
                return collection.get(id)
            }
        }
    },
    
    HasMany: function (collection, target_field, sort_fn)
    {
        return function ()
        {
            var filter = {}
            filter[target_field] = this.id
            
            var result = collection.find({ filter: filter })
            
            if (sort_fn)
            {
                result.sort(sort_fn)
            }
            
            return result
        }
    }
}