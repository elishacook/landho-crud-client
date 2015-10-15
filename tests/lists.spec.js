'use strict'

var mixin = require('../lib/mixin'),
    records = require('../lib/records'),
    Record = records.Record,
    Writable = records.Writable,
    lists = require('../lib/lists'),
    List = lists.List,
    DumbList = lists.DumbList,
    WatchList = lists.WatchList,
    SyncList = lists.SyncList,
    SyncListRecord = lists.SyncListRecord,
    watch = require('../lib/watch'),
    SyncDocument = require('sync-document'),
    computation = require('../lib/computation')


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


describe('List', function ()
{
    beforeEach(stub_computation)
    afterEach(unstub_computation)
    
    it('is a Watched', function ()
    {
        var list = new List()
        expect(mixin.has(list, watch.Watched.prototype)).to.be.true
    })
    
    it('is an Array', function ()
    {
        var list = new List()
        expect(list).to.be.instanceof(Array)
    })
    
    it('has a service', function ()
    {
        var list = new List('service')
        expect(list).to.have.property('service')
        expect(list.service).to.equal('service')
    })
    
    it('has options', function ()
    {
        var list = new List('service', { foo: 'bar' })
        expect(list).to.have.property('options')
        expect(list.options).to.deep.equal({ foo: 'bar' })
        
        var list2 = new List()
        expect(list2).to.have.property('options')
        expect(list2.options).to.deep.equal({})
    })
    
    it('has an error property', function ()
    {
        var list = new List()
        expect(list).to.have.property('error')
        expect(list.error).to.be.null
    })
    
    it('has an add() method that does nothing', function ()
    {
        var list = new List(),
            res = list.add()
        
        expect(res).to.be.undefined
        expect(list.length).to.equal(0)
    })
    
    it('has an onchange() method', function ()
    {
        var list = new List()
        
        expect(list.onchange).to.be.defined
        list.onchange()
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sorts during onchange() if a compare option is provided', function ()
    {
        var list = new List(null, { compare: function (a, b) { return a - b } })
        list.push(3)
        list.push(1)
        list.push(2)
        list.onchange()
        expect(list.slice(0)).to.deep.equal([1,2,3])
    })
})

describe('DumbList', function ()
{
    beforeEach(stub_computation)
    afterEach(unstub_computation)
    
    it('is a List', function ()
    {
        var list = new DumbList()
        expect(list).to.be.instanceof(List)
    })
    
    it('calls its service\'s find method on start', function ()
    {
        var list = new DumbList(sinon.stub(), { foo: 'bar' })
        list.start()
        expect(list.service).to.have.been.calledOnce
        expect(list.service.firstCall.args[0]).to.equal('find')
        expect(list.service.firstCall.args[1]).to.deep.equal({ foo: 'bar' })
        expect(list.service.firstCall.args[2]).to.be.instanceof(Function)
    })
    
    it('sets its error property if find is unsuccessful', function ()
    {
        var service = sinon.stub().callsArgWith(2, 'some error'),
            list = new DumbList(service, { foo: 'bar' })
        
        list.start()
        expect(list.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('updates its records with the results if find is successful', function ()
    {
        var service = sinon.stub().callsArgWith(2, null, [{id:1},{id:2},{id:3}]),
            list = new DumbList(service, { foo: 'bar' }, { foo: function () { return 123 } })
        
        var orig_records = list.slice(0)
        list.start()
        expect(list.length).to.equal(3)
        expect(list[0]).to.be.instanceof(Record)
        expect(list[0].id).to.equal(1)
        expect(list[0].foo()).to.equal(123)
        expect(list[1]).to.be.instanceof(Record)
        expect(list[1].id).to.equal(2)
        expect(list[2]).to.be.instanceof(Record)
        expect(list[2].id).to.equal(3)
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('creates, adds and returns a new DumbRecord when add() is called', function ()
    {
        var list = new DumbList(),
            record = list.add({ id: 'foo' })
        
        expect(record).to.be.instanceof(Record)
        expect(record.id).to.equal('foo')
        expect(list.slice(0)).to.deep.equal([record])
    })
})

describe('WatchList', function ()
{
    beforeEach(stub_computation)
    afterEach(unstub_computation)
    
    it('is a List', function ()
    {
        var list = new WatchList()
        expect(list).to.be.instanceof(List)
    })
    
    it('has a channel property', function ()
    {
        var list = new WatchList()
        expect(list).to.have.property('channel')
        expect(list.channel).to.be.null
    })
    
    it('has a started property', function ()
    {
        var list = new WatchList()
        expect(list).to.have.property('started')
        expect(list.started).to.be.false
    })
    
    it('loads its channel when start() is called', function ()
    {
        var list = new WatchList()
        list.load_channel = sinon.stub()
        list.start()
        expect(list.load_channel).to.have.been.calledOnce
    })
    
    it('does not load multiple channels if it is already started', function ()
    {
        var list = new WatchList()
        list.load_channel = sinon.stub()
        list.start()
        list.start()
        list.start()
        list.start()
        expect(list.load_channel).to.have.been.calledOnce
    })
    
    it('calls its service\'s find method in watch mode', function ()
    {
        var service = sinon.stub(),
            list = new WatchList(service, { things: 'foo' })
            
        list.load_channel()
        expect(service).to.have.been.calledOnce
        expect(service.args[0][0]).to.equal('find')
        expect(service.args[0][1]).to.deep.equal({ things: 'foo', watch: true })
    })
    
    it('sets the error property if the find call fails', function ()
    {
        var service = sinon.stub().callsArgWith(2, 'some error'),
            list = new WatchList(service, { things: 'foo' })
        
        list.start()
        expect(list.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets its channel property if the find call succeeds', function ()
    {
        var channel = { on: sinon.stub() },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new WatchList(service, { things: 'foo' })
        
        list.start()
        expect(list.channel).to.equal(channel)
    })
    
    it('sets a channel.initial handler that updates fields', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new WatchList(service, { things: 'foo' }, { foo: function () { return 123 } }),
            records = [ { id: 1, skidoo: 23 }, { id: 2, skidoo: 32 } ]
        
        list.start()
        expect(handlers).to.have.property('initial')
        expect(handlers.initial).to.be.instanceof(Function)
        handlers.initial(records)
        expect(list.length).to.equal(2)
        expect(list[0].fields).to.deep.equal(records[0])
        expect(list[0].foo()).to.equal(123)
        expect(list[1].fields).to.deep.equal(records[1])
        expect(list.records_by_id[records[0].id]).to.equal(list[0])
        expect(list.records_by_id[records[1].id]).to.equal(list[1])
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.update handler that updates one of its records', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new WatchList(service),
            records = [ { id: 1, skidoo: 23 }, { id: 2, skidoo: 32 } ]
        
        list.start()
        handlers.initial(records)
        expect(handlers).to.have.property('update')
        expect(handlers.update).to.be.instanceof(Function)
        handlers.update({ id: 2, skidoo: 666 })
        expect(list[1].skidoo).to.equal(666)
        expect(computation.async).to.have.been.calledTwice
    })
    
    it('sets a channel.error handler that sets the error property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new WatchList(service)
        
        list.start()
        expect(handlers).to.have.property('error')
        expect(handlers.error).to.be.instanceof(Function)
        handlers.error('some error')
        expect(list.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.insert handler that adds a new record', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new WatchList(service)
        
        list.start()
        expect(handlers).to.have.property('insert')
        expect(handlers.insert).to.be.instanceof(Function)
        handlers.insert({ id: 1, stuff: 'things' })
        expect(list.length).to.equal(1)
        expect(list[0].fields).to.deep.equal({ id: 1, stuff: 'things' })
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.delete handler that sets the deleted property and removes the record', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new WatchList(service)
        
        list.start()
        handlers.initial([{id:1},{id:2},{id:3}])
        var record = list[1]
        expect(handlers).to.have.property('delete')
        expect(handlers.delete).to.be.instanceof(Function)
        handlers.delete({ id: 2 })
        expect(record.deleted).to.be.true
        expect(list.length).to.equal(2)
        expect(list[0].id).to.equal(1)
        expect(list[1].id).to.equal(3)
        expect(computation.async).to.have.been.calledTwice
    })
})

describe('SyncList', function ()
{
    beforeEach(stub_computation)
    afterEach(unstub_computation)
    
    it('is a WatchList', function ()
    {
        var list = new SyncList()
        expect(list).to.be.instanceof(WatchList)
    })
    
    it('calls its service\'s find method in sync mode', function ()
    {
        var service = sinon.stub(),
            list = new SyncList(service, { things: 'foo' })
            
        list.load_channel()
        expect(service).to.have.been.calledOnce
        expect(service.args[0][0]).to.equal('find')
        expect(service.args[0][1]).to.deep.equal({ things: 'foo', sync: true })
    })
    
    it('sets the error property if the find call fails', function ()
    {
        var service = sinon.stub().callsArgWith(2, 'some error'),
            list = new SyncList(service, { things: 'foo' })
        
        list.start()
        expect(list.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets its channel property if the find call succeeds', function ()
    {
        var channel = { on: sinon.stub() },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new SyncList(service, { things: 'foo' })
        
        list.start()
        expect(list.channel).to.equal(channel)
    })
    
    it('sets a channel.initial handler that sets up the records property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new SyncList(service, { things: 'foo' }, { foo: function () { return 123 } }),
            records = [ { id: 1, skidoo: 23 }, { id: 2, skidoo: 32 } ]
        
        list.start()
        expect(handlers).to.have.property('initial')
        expect(handlers.initial).to.be.instanceof(Function)
        handlers.initial(records)
        expect(list.length).to.equal(2)
        expect(list[0].fields).to.deep.equal(records[0])
        expect(list[0].foo()).to.equal(123)
        expect(list[0]).to.be.instanceof(SyncListRecord)
        expect(list[1].fields).to.deep.equal(records[1])
        expect(list[1]).to.be.instanceof(SyncListRecord)
        expect(list.records_by_id[records[0].id]).to.equal(list[0])
        expect(list.records_by_id[records[1].id]).to.equal(list[1])
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.pull handler that pulls in edits for a record', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new SyncList(service),
            records = [ { id: 1, skidoo: 23 }, { id: 2, skidoo: 32 } ]
        
        list.start()
        handlers.initial(records)
        list[1].syncdoc.pull = sinon.stub()
        expect(handlers).to.have.property('pull')
        expect(handlers.pull).to.be.instanceof(Function)
        handlers.pull(2, ['some-edits'])
        expect(list[1].syncdoc.pull).to.have.been.calledOnce
        expect(list[1].syncdoc.pull).to.have.been.calledWith('some-edits')
        expect(computation.async).to.have.been.calledTwice
    })
    
    it('sets a channel.error handler that sets the error property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new SyncList(service)
        
        list.start()
        expect(handlers).to.have.property('error')
        expect(handlers.error).to.be.instanceof(Function)
        handlers.error('some error')
        expect(list.error).to.equal('some error')
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.insert handler that adds a new record', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new SyncList(service)
        
        list.start()
        expect(handlers).to.have.property('insert')
        expect(handlers.insert).to.be.instanceof(Function)
        handlers.insert({ id: 1, stuff: 'things' })
        expect(list.length).to.equal(1)
        expect(list[0].fields).to.deep.equal({ id: 1, stuff: 'things' })
        expect(list[0]).to.be.instanceof(SyncListRecord)
        expect(computation.async).to.have.been.calledOnce
    })
    
    it('sets a channel.delete handler that removes a record and sets its deleted property', function ()
    {
        var handlers = {},
            channel = { on: function (event, fn) { handlers[event] = fn } },
            service = sinon.stub().callsArgWith(2, null, channel),
            list = new SyncList(service)
        
        list.start()
        handlers.initial([{id:1},{id:2},{id:3}])
        var record = list[1]
        expect(handlers).to.have.property('delete')
        expect(handlers.delete).to.be.instanceof(Function)
        handlers.delete(2)
        expect(record.deleted).to.be.true
        expect(list.length).to.equal(2)
        expect(list[0].id).to.equal(1)
        expect(list[1].id).to.equal(3)
        expect(computation.async).to.have.been.calledTwice
    })
    
    it('has a push_changes() method that sends edits from a SyncListRecord', function ()
    {
        var list = new SyncList(),
            record = {
                id: 123,
                syncdoc:
                {
                    push: sinon.stub(),
                    edits: [1,2,3]
                }
            }
            
        list.channel = { emit: sinon.stub() }
        list.push_changes(record)
        expect(record.syncdoc.push).to.have.been.calledOnce
        expect(list.channel.emit).to.have.been.calledOnce
        expect(list.channel.emit.firstCall.args).to.deep.equal(['pull', 123, [1,2,3]])
    })
})

describe('SyncListRecord', function ()
{
    it('is a Record', function ()
    {
        var record = new SyncListRecord()
        expect(record).to.be.instanceof(Record)
    })
    
    it('is Writable', function ()
    {
        var record = new SyncListRecord()
        expect(mixin.has(record, Writable)).to.be.true
    })
    
    it('pushes itself to its list on push()', function ()
    {
        var list = { push_changes: sinon.stub() },
            record = new SyncListRecord(list)
        
        record.syncdoc = {}
        record.push()
        
        expect(list.push_changes).to.have.been.calledOnce
        expect(list.push_changes).to.have.been.calledWith(record)
    })
    
    it('does not push itself if it has no syncdoc', function ()
    {
        var list = { push: sinon.stub() },
            record = new SyncListRecord(list)
        
        record.push()
        expect(list.push).to.not.have.been.called
    })
    
    it('does not push itself if it has been deleted', function ()
    {
        var list = { push: sinon.stub() },
            record = new SyncListRecord(list)
        
        record.deleted = true
        record.push()
        expect(list.push).to.not.have.been.called
    })
})