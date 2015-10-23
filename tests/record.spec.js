'use strict'

var Record = require('../lib/record')


describe('Record', function ()
{
    it('has empty fields by default', function ()
    {
        var record = new Record()
        expect(record.fields).to.deep.equal({})
    })
    
    it('has a null syncdoc property by default', function ()
    {
        var record = new Record()
        expect(record.syncdoc).to.be.null
    })
    
    it('can be provided with a fields object at construction', function ()
    {
        var fields = {},
            record = new Record(fields)
            
        expect(record.fields).to.equal(fields)
    })
    
    it('has a get method', function ()
    {
        var record = new Record({ foo: 'bar' })
        expect(record.get('foo')).to.equal('bar')
    })
    
    it('has a set method', function ()
    {
        var record = new Record({})
        record.set('foo', 'bar')
        expect(record.get('foo')).to.equal('bar')
    })
    
    it('emits a local-change event after a set()', function (done)
    {
        var record = new Record({})
        
        record.on('local-change', function (r)
        {
            expect(r).to.equal(record)
            expect(r.get('foo')).to.equal('bar')
            done()
        })
        
        record.set('foo', 'bar')
    })
    
    it('has an update method', function ()
    {
        var record = new Record({})
        record.update({ foo: 'bar' })
        expect(record.get('foo')).to.equal('bar')
    })
    
    it('emits a local-change event after an update()', function (done)
    {
        var record = new Record({})
        
        record.on('local-change', function (r)
        {
            expect(r).to.equal(record)
            expect(r.get('foo')).to.equal('bar')
            done()
        })
        
        record.update({ foo: 'bar' })
    })
    
    it('does not emit a local-change event if after an update in quiet mode', function ()
    {
        var record = new Record({}),
            change = sinon.spy()
        
        record.on('local-change', change)
        
        record.update({ foo: 'bar' }, true)
        
        expect(change).to.not.have.been.called
    })
    
    it('does not replace the field object when updating', function ()
    {
        var fields = {},
            record = new Record(fields)
        record.update({ foo: 'bar' })
        expect(record.fields).to.equal(fields)
    })
    
    it('has a deleted property', function ()
    {
        var record = new Record()
        expect(record.deleted).to.be.false
    })
    
    it('has a close method', function ()
    {
        var record = new Record(),
            close = sinon.stub()
        
        record.on('close', close)
        record.close()
        expect(close).to.have.been.calledOnce
    })
    
    it('has an abort method', function ()
    {
        var record = new Record(),
            onchange = sinon.stub()
        
        record.on('local-change', onchange)
        record.abort({ foo: { old_val: 23 } })
        expect(record.get('foo')).to.equal(23)
        expect(onchange).to.not.have.been.called
    })
    
    it('has a commit method', function ()
    {
        var record = new Record(),
            onchange = sinon.stub()
        
        record.set('foo', 'bar')
        record.on('local-change', onchange)
        record.commit({ foo: 'baz' })
        expect(record.get('foo')).to.equal('bar')
        expect(onchange).to.have.been.calledOnce
        expect(onchange).to.have.been.calledWith(record)
    })
    
    it('has an undo method', function ()
    {
        var record = new Record(),
            onchange = sinon.stub()
        
        record.on('local-change', onchange)
        record.undo({ foo: { old_val: 23 } })
        expect(record.get('foo')).to.equal(23)
        expect(onchange).to.have.been.calledOnce
        expect(onchange).to.have.been.calledWith(record)
    })
    
    it('has a redo method', function ()
    {
        var record = new Record(),
            onchange = sinon.stub()
        
        record.on('local-change', onchange)
        record.redo({ foo: { new_val: 23 } })
        expect(record.get('foo')).to.equal(23)
        expect(onchange).to.have.been.calledOnce
        expect(onchange).to.have.been.calledWith(record)
    })
})