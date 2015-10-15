'use strict'

var relations = require('../lib/relations')

describe('HasMany', function ()
{
    it('returns a list from the target collection', function ()
    {
        var collection = { find: sinon.stub().returns('a list') },
            many = relations.HasMany(collection, 'foo_id'),
            record = { id: 123 }
        
        var list = many.apply(record)
        expect(list).to.equal('a list')
        expect(collection.find).to.have.been.calledOnce
        expect(collection.find).to.have.been.calledWith({ index: 'foo_id', value: 123 })
    })
    
    it('passes options to the find() call', function ()
    {
        var collection = { find: sinon.stub().returns('a list') },
            many = relations.HasMany(collection, 'foo_id'),
            record = { id: 123 }
        
        var list = many.call(record, { sync: true })
        expect(collection.find).to.have.been.calledWith({ index: 'foo_id', value: 123, sync: true })
    })
})