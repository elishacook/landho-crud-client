'use strict'

var List = require('../lib/list'),
    Record = require('../lib/record')

describe('List', function ()
{
    it('is an Array', function ()
    {
        var list = new List()
        expect(list).to.be.instanceof(Array)
    })
    
    it('is empty by default', function ()
    {
        var list = new List()
        expect(list.length).to.equal(0)
    })
    
    it('has a remove method that removes an element by id', function ()
    {
        var list = new List()
        list.push(new Record({ id: 1 }))
        list.push(new Record({ id: 2 }))
        list.push(new Record({ id: 3 }))
        list.remove(2)
        expect(list.length).to.equal(2)
        expect(list[0].fields).to.deep.equal({ id: 1 })
        expect(list[1].fields).to.deep.equal({ id: 3 })
    })
    
    it('is an event emitter', function (done)
    {
        var list = new List()
        
        list.on('foo', done)
        list.emit('foo')
    })
    
    it('has a method to get an item by id', function ()
    {
        var list = new List()
        list.push(new Record({ id: 1 }))
        list.push(new Record({ id: 2 }))
        list.push(new Record({ id: 3 }))
        var item = list.get(2)
        expect(item).to.equal(list[1])
    })
    
    it('has a method to set the value of a specific index', function ()
    {
        var list = new List()
        list.length = 10
        list.set(3, new Record({id: 'foo'}))
        var foo = list.get('foo')
        expect(foo).to.be.defined
        expect(list[3]).to.equal(foo)
    })
})