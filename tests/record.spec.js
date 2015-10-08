'use strict'

var Record = require('../lib/record')

describe('Record', function ()
{
    it('has deleted and error properties by default', function ()
    {
        var r = new Record()
        expect(r.deleted).to.be.false
        expect(r.error).to.be.null
    })
    
    it('can have fields', function ()
    {
        var r = new Record({ foo: 123, bar: 'sneech' })
        expect(r.foo).to.equal(123)
        expect(r.bar).to.equal('sneech')
    })
    
    it('can have default fields', function ()
    {
        var r = new Record({ foo: 123, bar: 'sneech' }, { foo: 666, baz: 'hats' })
        expect(r.foo).to.equal(123)
        expect(r.bar).to.equal('sneech')
        expect(r.baz).to.equal('hats')
    })
    
    it('can be serialized to a plain object', function ()
    {
        var r = new Record({ foo: 123, bar: 'sneech' }),
            r_obj = r.serialize()
        
        expect(r_obj).to.deep.equal({ foo: 123, bar: 'sneech' })
    })
    
    it('has an update method', function ()
    {
        var r = new Record({ foo: 123, bar: 'sneech' })
        r.update({ foo: 666 })
        expect(r.foo).to.equal(666)
        expect(r.bar).to.equal('sneech')
    })
    
    it('can manufacture property functions for its fields', function ()
    {
        var r = new Record({ foo: 123, bar: 'sneech' }),
            bar = r.property('bar')
        
        expect(bar()).to.equal('sneech')
        bar('helicopter')
        expect(bar()).to.equal('helicopter')
    })
    
    it('can have methods', function ()
    {
        var r = new Record(
            { foo: 123, bar: 'sneech' }, null,
            {
                doit: function ()
                {
                    return this.foo * 2
                }
            })
        
        expect(r.doit()).to.equal(246)
    })
    
    it('has relation functions', function ()
    {
        var rel = function ()
            {
                return 'rel-'+this.id
            },
            r = new Record({ id: 123 }, null, null, { foo: rel })
        
        expect(r.foo).to.equal('rel-123')
    })
})