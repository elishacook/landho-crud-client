'use strict'

var mixin = require('../lib/mixin'),
    records = require('../lib/records'),
    Record = records.Record,
    Writable = records.Writable,
    DumbRecord = records.DumbRecord,
    WatchRecord = records.WatchRecord,
    SyncRecord = records.SyncRecord,
    watch = require('../lib/watch'),
    computation = require('../lib/computation'),
    SyncDocument = require('sync-document')

var old_async
function stub_computation ()
{
    old_async = computation.async
    computation.async = sinon.stub()
}

function unstub_computation ()
{
    computation.async = old_async
}


describe('Record', function ()
{
    it('is a Watched', function ()
    {
        var record = new Record()
        expect(record).to.be.instanceof(watch.Watched)
    })
    
    it('has fields', function ()
    {
        var record = new Record({ foo: 'bar' })
        expect(record.fields).to.deep.equal({ foo: 'bar' })
    })
    
    it('has methods', function ()
    {
        var record = new Record(
            { foo: 'bar' },
            {
                how_are_you: function ()
                {
                    return 'Ready to go to the '+this.get('foo')
                }
            })
        
        expect(record.how_are_you()).to.equal('Ready to go to the bar')
    })
    
    it('has an error property', function ()
    {
        var record = new Record()
        expect(record).to.have.property('error')
        expect(record.error).to.be.null
    })
    
    it('has a deleted property', function ()
    {
        var record = new Record()
        expect(record).to.have.property('deleted')
        expect(record.deleted).to.be.false
    })
    
    it('has an onupdate() method that updates its fields', function ()
    {
        var record = new Record()
        record.onupdate({ foo: 'bar' })
        expect(record.fields).to.deep.equal({foo:'bar'})
    })
    
    it('has a get() method that returns field values', function ()
    {
        var record = new Record({foo:'bar'})
        expect(record.get('foo')).to.equal('bar')
        expect(record.get('quaze')).to.be.undefined
    })
    
    it('adds properties for its fields', function ()
    {
        var record = new Record({foo:'bar'})
        expect(record.foo).to.equal('bar')
    })
})


describe('WritableMixin', function ()
{
    var WritableRecord = function (fields)
    {
        Record.call(this, fields)
    }
    WritableRecord.prototype = Object.create(Record.prototype)
    mixin(WritableRecord, Writable)
    
    it('has a set() method that sets field values and calls push()', function ()
    {
        var record = new WritableRecord()
        record.push = sinon.stub()
        record.set('foo', 'bar')
        expect(record.get('foo')).to.equal('bar')
        expect(record.push).to.have.been.calledOnce
    })
    
    it('has an update() method that sets field values and calls push()', function ()
    {
        var record = new WritableRecord()
        record.push = sinon.stub()
        record.update({ foo: 'bar', quaze: 'lab' })
        expect(record.get('foo')).to.equal('bar')
        expect(record.get('quaze')).to.equal('lab')
        expect(record.push).to.have.been.calledOnce
    })
    
    it('adds properties on update', function ()
    {
        var record = new WritableRecord({})
        record.update({foo:'bar'})
        expect(record.foo).to.equal('bar')
    })
    
    it('adds properties on set', function ()
    {
        var record = new WritableRecord({})
        record.set('foo', 'bar')
        expect(record.foo).to.equal('bar')
    })
})


describe('DumbRecord', function ()
{
    beforeEach(stub_computation)
    afterEach(unstub_computation)
    
    it('is a Record', function ()
    {
        var record = new DumbRecord()
        expect(record).to.be.instanceof(Record)
    })
    
    it('calls its service\'s get method on start', function ()
    {
        var service = sinon.stub(),
            record = new DumbRecord(service, { id: 'foo' })
        
        record.start()
        expect(service).to.have.been.calledOnce
        expect(service.args[0][0]).to.equal('get')
        expect(service.args[0][1]).to.deep.equal({ id: 'foo' })
    })
    
    it('sets the error property if the get call fails', function ()
    {
        var service = sinon.stub().callsArgWith(2, 'some error'),
            record = new DumbRecord(service, { id: 'foo' })
        
        record.start()
        expect(record.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('updates its fields if the get call succeeds', function ()
    {
        var service = sinon.stub().callsArgWith(2, null, { skidoo: 23 }),
            record = new DumbRecord(service, { id: 'foo' })
        
        record.start()
        expect(record.get('skidoo')).to.equal(23)
        expect(computation.async).to.have.been.calledOnce
    })
})


describe('WatchRecord', function ()
{
    beforeEach(stub_computation)
    afterEach(unstub_computation)
    
    it('is a Record', function ()
    {
        var record = new WatchRecord()
        expect(record).to.be.instanceof(Record)
    })
    
    it('has a channel property', function ()
    {
        var record = new WatchRecord()
        expect(record).to.have.property('channel')
        expect(record.channel).to.be.null
    })
    
    it('has a started property', function ()
    {
        var record = new WatchRecord()
        expect(record).to.have.property('started')
        expect(record.started).to.be.false
    })
    
    it('loads its channel when start() is called', function ()
    {
        var record = new WatchRecord()
        record.load_channel = sinon.stub()
        record.start()
        expect(record.load_channel).to.have.been.calledOnce
    })
    
    it('does not load multiple channels if it is already started', function ()
    {
        var record = new WatchRecord()
        record.load_channel = sinon.stub()
        record.start()
        record.start()
        record.start()
        record.start()
        expect(record.load_channel).to.have.been.calledOnce
    })
    
    it('calls its service\'s get method in watch mode', function ()
    {
        var service = sinon.stub(),
            record = new WatchRecord(service, { id: 'foo' })
            
        record.load_channel()
        expect(service).to.have.been.calledOnce
        expect(service.args[0][0]).to.equal('get')
        expect(service.args[0][1]).to.deep.equal({ id: 'foo', watch: true })
    })
    
    it('sets the error property if the get call fails', function ()
    {
        var service = sinon.stub().callsArgWith(2, 'some error'),
            record = new WatchRecord(service, { id: 'foo' })
        
        record.start()
        expect(record.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets its channel property if the get call succeeds', function ()
    {
        var channel = { on: sinon.stub() },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new WatchRecord(service, { id: 'foo' })
        
        record.start()
        expect(record.channel).to.equal(channel)
    })
    
    it('sets a channel.initial handler that updates fields', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new WatchRecord(service, { id: 'foo' })
        
        record.start()
        expect(handlers).to.have.property('initial')
        expect(handlers.initial).to.be.instanceof(Function)
        handlers.initial({ things: 'stuff' })
        expect(record.get('things')).to.equal('stuff')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.update handler that updates fields', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new WatchRecord(service, { id: 'foo' })
        
        record.start()
        expect(handlers).to.have.property('update')
        expect(handlers.update).to.be.instanceof(Function)
        handlers.update({ things: 'stuff' })
        expect(record.get('things')).to.equal('stuff')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.error handler that sets the error property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new WatchRecord(service, { id: 'foo' })
        
        record.start()
        expect(handlers).to.have.property('error')
        expect(handlers.error).to.be.instanceof(Function)
        handlers.error('some error')
        expect(record.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.delete handler that sets the deleted property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new WatchRecord(service, { id: 'foo' })
        
        record.start()
        expect(handlers).to.have.property('delete')
        expect(handlers.delete).to.be.instanceof(Function)
        expect(record.deleted).to.be.false
        handlers.delete()
        expect(record.deleted).to.be.true
        expect(computation.async).to.have.been.calledOnce
    })
})


describe('SyncRecord', function ()
{
    beforeEach(stub_computation)
    afterEach(unstub_computation)
    
    it('is a WatchRecord', function ()
    {
        var record = new SyncRecord()
        expect(record).to.be.instanceof(WatchRecord)
    })
    
    it('is a WritableMixin', function ()
    {
        var record = new SyncRecord()
        expect(record.set).to.equal(WritableMixin.Writable.set)
    })
    
    it('has a syncdoc property', function ()
    {
        var record = new SyncRecord()
        expect(record).to.have.property('syncdoc')
        expect(record.syncdoc).to.be.null
    })
    
    it('calls its service\'s get method in watch mode', function ()
    {
        var service = sinon.stub(),
            record = new SyncRecord(service, { id: 'foo' })
            
        record.load_channel()
        expect(service).to.have.been.calledOnce
        expect(service.args[0][0]).to.equal('get')
        expect(service.args[0][1]).to.deep.equal({ id: 'foo', sync: true })
    })
    
    it('sets the error property if the get call fails', function ()
    {
        var service = sinon.stub().callsArgWith(2, 'some error'),
            record = new SyncRecord(service, { id: 'foo' })
        
        record.start()
        expect(record.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets its channel property if the get call succeeds', function ()
    {
        var channel = { on: sinon.stub() },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new SyncRecord(service, { id: 'foo' })
        
        record.start()
        expect(record.channel).to.equal(channel)
    })
    
    it('sets a channel.initial handler that sets up syncdoc and pushes changes', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new SyncRecord(service, { id: 'foo' })
        
        record.push = sinon.stub()
        
        record.start()
        
        expect(handlers).to.have.property('initial')
        expect(handlers.initial).to.be.instanceof(Function)
        handlers.initial({ id: 'foo', things: 'stuff' })
        expect(record.push).to.have.been.calledOnce
        expect(record.syncdoc).to.be.instanceof(SyncDocument)
        record.syncdoc.push()
        expect(record.syncdoc.edits).to.deep.equal(
        [
            {
                version: 0,
                other_version: 0,
                delta: { things: ['stuff', 0, 0] }
            }
        ])
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sends edits on its channel when push() is called', function ()
    {
        var record = new SyncRecord({ id: 'foo' })
        record.syncdoc = { edits: 'some edits', push: sinon.stub() }
        record.channel = { emit: sinon.stub() }
        record.push()
        expect(record.syncdoc.push).to.have.been.calledOnce
        expect(record.channel.emit).to.have.been.calledOnce
        expect(record.channel.emit).to.have.been.calledWith('pull', 'some edits')
    })
    
    it('does not send anything on its channel when push() is called without edits', function ()
    {
        var record = new SyncRecord({ id: 'foo' })
        record.syncdoc = { edits: [], push: sinon.stub() }
        record.channel = { emit: sinon.stub() }
        record.push()
        expect(record.syncdoc.push).to.have.been.calledOnce
        expect(record.channel.emit).to.not.have.been.called
    })
    
    it('sets a channel.pull handler that pulls edits', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new SyncRecord(service, { id: 'foo' })
        
        record.syncdoc = { pull: sinon.stub(), edits: [] }
        record.start()
        expect(handlers).to.have.property('pull')
        expect(handlers.pull).to.be.instanceof(Function)
        handlers.pull([3,2,1])
        expect(record.syncdoc.pull).to.have.been.calledThrice
        expect(record.syncdoc.pull.firstCall.args[0]).to.equal(3)
        expect(record.syncdoc.pull.secondCall.args[0]).to.equal(2)
        expect(record.syncdoc.pull.thirdCall.args[0]).to.equal(1)
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('emits a pull after receiving edits if there are pending edits', function ()
    {
        var events = {},
            handlers = {},
            channel = { 
                on: function (name, data) { handlers[name] = data },
                emit: function (name, data) { events[name] = data }
            },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new SyncRecord(service, { id: 'foo' })
        
        record.syncdoc = { pull: sinon.stub(), edits: [1,2,3] }
        record.start()
        handlers.pull([3,2,1])
        expect(events).to.have.property('pull')
        expect(events.pull).to.deep.equal([1,2,3])
    })
    
    it('sets a channel.error handler that sets the error property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new SyncRecord(service, { id: 'foo' })
        
        record.start()
        expect(handlers).to.have.property('error')
        expect(handlers.error).to.be.instanceof(Function)
        handlers.error('some error')
        expect(record.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.delete handler that sets the deleted property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            record = new SyncRecord(service, { id: 'foo' })
        
        record.start()
        expect(handlers).to.have.property('delete')
        expect(handlers.delete).to.be.instanceof(Function)
        expect(record.deleted).to.be.false
        handlers.delete()
        expect(record.deleted).to.be.true
        expect(computation.async).to.have.been.calledOnce
    })
})
