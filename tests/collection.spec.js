'use strict'

var Collection = require('../lib/collection'),
    Record = require('../lib/record'),
    List = require('../lib/list'),
    computation = require('../lib/computation'),
    SimpleEvents = require('@elishacook/simple-events')

function fake_channel()
{
    var channel = new SimpleEvents()
    channel.close = sinon.spy()
    return channel
}

    
describe('Collection', function ()
{
    beforeEach(function ()
    {
        computation.remove_all_listeners()
    })
    
    it('has a service property', function ()
    {
        var coll = new Collection('service')
        expect(coll.service).to.equal('service')
    })
    
    describe('get()', function ()
    {
        it('returns a record', function ()
        {
            var coll = new Collection(sinon.stub()),
                record = coll.get(123)
            
            expect(record).to.be.instanceof(Record)
            expect(record.get('id')).to.equal(123)
        })
        
        it('calls its service\'s get method', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123)
            
            expect(service).to.have.been.calledOnce
            expect(service.firstCall.args[0]).to.equal('get')
            expect(service.firstCall.args[1]).to.deep.equal({ id: 123, watch: true })
        })
        
        it('calls computation.start()', function ()
        {
            var coll = new Collection(sinon.stub()),
                start = sinon.stub()
            
            computation.on('start', start)
            
            coll.get(123)
            
            expect(start).to.have.been.calledOnce
        })
        
        it('emits an error event on the record if there is an error', function (done)
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123)
            
            record.on('error', function (err)
            {
                expect(err).to.equal('foo')
                done()
            })
            
            service.firstCall.args[2]('foo')
        })
        
        it('calls computation.end() if there is an error', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                end = sinon.stub()
            
            computation.on('end', end)
            
            service.firstCall.args[2]('foo')
            
            expect(end).to.have.been.calledOnce
        })
        
        it('emits an error event on record if there is an error channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                error = sinon.stub()
            
            record.on('error', error)
            service.firstCall.args[2](null, channel)
            channel.emit('error', { foo: 'bar' })
            expect(error).to.have.been.calledOnce
            expect(error).to.have.been.calledWith({foo: 'bar'})
        })
        
        it('calls computation.end() if there is an error channel event before initialization', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                end = sinon.stub()
            
            computation.on('end', end)
            
            service.firstCall.args[2](null, channel)
            channel.emit('error')
            
            expect(end).to.have.been.calledOnce
        })
        
        it('calls computation.async() if there is an error channel event after initialization', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                async = sinon.stub()
            
            computation.on('async', async)
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', {})
            channel.emit('error')
            
            expect(async).to.have.been.calledOnce
        })
        
        it('updates record\'s fields in quiet mode on initial channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel()
            
            record.update = sinon.spy()
            service.firstCall.args[2](null, channel)
            channel.emit('initial', { foo: 'bar' })
            expect(record.update).to.have.been.calledOnce
            expect(record.update).to.have.been.calledWith({foo: 'bar'}, true)
        })
        
        it('emits change event on record on initial channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                change = sinon.stub()
            
            record.on('change', change)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', { foo: 'bar' })
            expect(change).to.have.been.calledOnce
            expect(change.firstCall.args[0]).to.equal(record)
        })
        
        it('calls computation.end() on initial channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                end = sinon.stub()
            
            computation.on('end', end)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', { foo: 'bar' })
            expect(end).to.have.been.calledOnce
        })
        
        it('updates record\'s fields in quiet mode on update channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel()
            
            record.update = sinon.spy()
            service.firstCall.args[2](null, channel)
            channel.emit('update', { foo: 'bar' })
            expect(record.update).to.have.been.calledOnce
            expect(record.update).to.have.been.calledWith({foo: 'bar'}, true)
        })
        
        it('emits change event on record on update channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                change = sinon.stub()
            
            record.on('change', change)
            service.firstCall.args[2](null, channel)
            channel.emit('update', { foo: 'bar' })
            expect(change).to.have.been.calledOnce
            expect(change.firstCall.args[0]).to.equal(record)
        })
        
        it('calls computation.async() on update channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                async = sinon.stub()
            
            computation.on('async', async)
            service.firstCall.args[2](null, channel)
            channel.emit('update', { foo: 'bar' })
            expect(async).to.have.been.calledOnce
        })
        
        it('sets record\'s deleted property on delete channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('delete')
            expect(record.deleted).to.be.true
        })
        
        it('emits delete event on record on delete channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                deleted = sinon.stub()
            
            record.on('delete', deleted)
            service.firstCall.args[2](null, channel)
            channel.emit('delete')
            expect(deleted).to.have.been.calledOnce
            expect(deleted.firstCall.args[0]).to.equal(record)
        })
        
        it('calls computation.async() on delete channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel(),
                async = sinon.stub()
            
            computation.on('async', async)
            service.firstCall.args[2](null, channel)
            channel.emit('delete')
            expect(async).to.have.been.calledOnce
        })
        
        it('calls channel.close() on record close event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123),
                channel = fake_channel()
            
            channel.close = sinon.stub()
            service.firstCall.args[2](null, channel)
            record.emit('close')
            expect(channel.close).to.have.been.calledOnce
        })
    })
    
    describe('get(sync=true)', function ()
    {
        it('returns a record', function ()
        {
            var coll = new Collection(sinon.stub()),
                record = coll.get(123, true)
            
            expect(record).to.be.instanceof(Record)
            expect(record.get('id')).to.equal(123)
        })
        
        it('calls its service\'s get method with the sync options', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123, true)
            
            expect(service).to.have.been.calledOnce
            expect(service.firstCall.args[0]).to.equal('get')
            expect(service.firstCall.args[1]).to.deep.equal({ id: 123, sync: true })
        })
        
        it('updates record\'s fields on initial channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123, true),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', { foo: 'bar' })
            expect(record.get('foo')).to.equal('bar')
        })
        
        it('updates record\'s fields on pull channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123, true),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', {})
            channel.emit('pull', [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }])
            expect(record.get('foo')).to.equal('bar')
        })
        
        
        it('emits change event on record on pull channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123, true),
                channel = fake_channel(),
                change = sinon.stub()
            
            record.on('change', change)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', {})
            channel.emit('pull', [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }])
            expect(change).to.have.been.calledTwice
            expect(change.firstCall.args[0]).to.equal(record)
        })
        
        it('calls computation.async() on pull channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123, true),
                channel = fake_channel(),
                async = sinon.stub()
            
            computation.on('async', async)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', {})
            channel.emit('pull', [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }])
            expect(async).to.have.been.calledOnce
        })
        
        it('emits a pull channel event when a record field is set', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123, true),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', {})
            channel.emit = sinon.stub()
            record.set('foo', 'bar')
            expect(channel.emit).to.have.been.calledOnce
            expect(channel.emit).to.have.been.calledWith(
                'pull',
                [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]
            )
        })
        
        it('emits a pull channel event when a record is updated', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                record = coll.get(123, true),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', {})
            channel.emit = sinon.stub()
            record.update({ foo: 'bar' })
            expect(channel.emit).to.have.been.calledOnce
            expect(channel.emit).to.have.been.calledWith(
                'pull',
                [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]
            )
        })
    })

    describe('find()', function ()
    {
        it('returns a List', function ()
        {
            var coll = new Collection(sinon.stub()),
                list = coll.find()
            
            expect(list).to.be.instanceof(List)
        })
        
        it('calls its service\'s find method', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ foo: 'bar' })
                
            expect(service).to.have.been.calledOnce
            expect(service.firstCall.args[0]).to.equal('find')
            expect(service.firstCall.args[1]).to.deep.equal({ foo: 'bar', watch: true })
        })
        
        it('calls computation.start()', function ()
        {
            var coll = new Collection(sinon.stub()),
                start = sinon.stub()
            
            computation.on('start', start)
            
            coll.find()
            
            expect(start).to.have.been.calledOnce
        })
        
        it('emits an error event on the list if there is an error', function (done)
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find()
            
            list.on('error', function (err)
            {
                expect(err).to.equal('foo')
                done()
            })
            
            service.firstCall.args[2]('foo')
        })
        
        it('calls computation.end() if there is an error', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                end = sinon.stub()
            
            computation.on('end', end)
            
            service.firstCall.args[2]('foo')
            
            expect(end).to.have.been.calledOnce
        })
        
        it('emits an error event on list if there is an error channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                error = sinon.stub()
            
            list.on('error', error)
            service.firstCall.args[2](null, channel)
            channel.emit('error', { foo: 'bar' })
            expect(error).to.have.been.calledOnce
            expect(error).to.have.been.calledWith({foo: 'bar'})
        })
        
        it('calls computation.end() if there is an error channel event before initialization', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                end = sinon.stub()
            
            computation.on('end', end)
            
            service.firstCall.args[2](null, channel)
            channel.emit('error')
            
            expect(end).to.have.been.calledOnce
        })
        
        it('calls computation.async() if there is an error channel event after initialization', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                async = sinon.stub()
            
            computation.on('async', async)
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [])
            channel.emit('error')
            
            expect(async).to.have.been.calledOnce
        })
        
        it('updates list on initial channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [{id:1, foo:'bar'},{id: 2, skidoo:23}])
            expect(list.length).to.equal(2)
            expect(list[0]).to.be.instanceof(Record)
            expect(list[0].get('id')).to.equal(1)
            expect(list[0].get('foo')).to.equal('bar')
            expect(list[1]).to.be.instanceof(Record)
            expect(list[1].get('id')).to.equal(2)
            expect(list[1].get('skidoo')).to.equal(23)
        })
        
        it('emits change event on list on initial channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                change = sinon.stub()
            
            list.on('change', change)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [])
            expect(change).to.have.been.calledOnce
            expect(change.firstCall.args[0]).to.equal(list)
        })
        
        it('calls computation.end() on initial channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                end = sinon.stub()
            
            computation.on('end', end)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [])
            expect(end).to.have.been.calledOnce
        })
        
        it('updates record in quiet mode on update channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel()
            
            list.push(new Record({ id: 1, foo: 'bar' }))
            list[0].update = sinon.spy()
            
            service.firstCall.args[2](null, channel)
            channel.emit('update', { id: 1, skidoo: 23 })
            expect(list.length).to.equal(1)
            expect(list[0].update).to.have.been.calledOnce
            expect(list[0].update).to.have.been.calledWith({ id: 1, skidoo: 23 }, true)
        })
        
        it('emits change event on list on update channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                change = sinon.stub()
            
            list.push(new Record({ id: 1, foo: 'bar' }))
            list.on('change', change)
            service.firstCall.args[2](null, channel)
            channel.emit('update', { id: 1, foo: 'baz' })
            expect(change).to.have.been.calledOnce
            expect(change.firstCall.args[0]).to.equal(list)
        })
        
        it('calls computation.async() on update channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                async = sinon.stub()
            
            list.push(new Record({ id: 1, foo: 'bar' }))
            computation.on('async', async)
            service.firstCall.args[2](null, channel)
            channel.emit('update', { id: 1, foo: 'baz' })
            expect(async).to.have.been.calledOnce
        })
        
        it('creates a record and adds it to the list on insert channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel()
                
            list.remove = sinon.spy()
            service.firstCall.args[2](null, channel)
            channel.emit('insert', { id: 'foo' })
            expect(list.length).to.equal(1)
            expect(list[0].get('id')).to.equal('foo')
        })
        
        it('emits change event on list on insert channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                change = sinon.stub()
            
            list.on('change', change)
            service.firstCall.args[2](null, channel)
            channel.emit('insert', { id: 'foo' })
            expect(change).to.have.been.calledOnce
            expect(change.firstCall.args[0]).to.equal(list)
        })
        
        it('calls computation.async() on insert channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                async = sinon.stub()
            
            computation.on('async', async)
            service.firstCall.args[2](null, channel)
            channel.emit('insert', { id: 'foo' })
            expect(async).to.have.been.calledOnce
        })
        
        it('sets a records deleted property and removes it from the list on delete channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel()
            
            list.push(new Record({ id: 1 }))
            list.push(new Record({ id: 2 }))
            list.push(new Record({ id: 3 }))
            list.remove = sinon.spy()
            var record = list[1]
            service.firstCall.args[2](null, channel)
            channel.emit('delete', 2)
            expect(record.deleted).to.be.true
            expect(list.remove).to.have.been.calledOnce
            expect(list.remove).to.have.been.calledWith(2)
        })
        
        it('emits delete event on list on delete channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                deleted = sinon.stub()
            
            list.push(new Record({ id: 1 }))
            list.on('delete', deleted)
            service.firstCall.args[2](null, channel)
            channel.emit('delete', 1)
            expect(deleted).to.have.been.calledOnce
            expect(deleted.firstCall.args[0]).to.equal(list)
        })
        
        it('calls computation.async() on delete channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel(),
                async = sinon.stub()
            
            list.push(new Record({ id: 1 }))
            computation.on('async', async)
            service.firstCall.args[2](null, channel)
            channel.emit('delete', 1)
            expect(async).to.have.been.calledOnce
        })
        
        it('calls channel.close() on list close event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find(),
                channel = fake_channel()
            
            channel.close = sinon.stub()
            service.firstCall.args[2](null, channel)
            list.emit('close')
            expect(channel.close).to.have.been.calledOnce
        })
    })
    
    describe('find(sync=true)', function ()
    {
        it('calls its service\'s find method in sync mode', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ foo: 'bar', sync: true })
                
            expect(service).to.have.been.calledOnce
            expect(service.firstCall.args[0]).to.equal('find')
            expect(service.firstCall.args[1]).to.deep.equal({ foo: 'bar', sync: true })
        })
        
        it('updates record\'s fields on pull channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ sync: true }),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [{id: 1}])
            channel.emit('pull', { id: 1, edits: [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]})
            expect(list[0].get('foo')).to.equal('bar')
        })
        
        it('emits change event on record on pull channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ sync: true }),
                channel = fake_channel(),
                change = sinon.stub()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [{id: 1}])
            var record = list[0]
            record.on('change', change)
            channel.emit('pull', { id: 1, edits: [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]})
            expect(change).to.have.been.calledOnce
            expect(change.firstCall.args[0]).to.equal(record)
        })
        
        it('emits change event on list on pull channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ sync: true }),
                channel = fake_channel(),
                change = sinon.stub()
            
            list.on('change', change)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [{id: 1}])
            channel.emit('pull', { id: 1, edits: [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]})
            expect(change).to.have.been.calledTwice
            expect(change.firstCall.args[0]).to.equal(list)
        })
        
        it('calls computation.async() on pull channel event', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ sync: true }),
                channel = fake_channel(),
                async = sinon.stub()
            
            computation.on('async', async)
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [{id: 1}])
            channel.emit('pull', { id: 1, edits: [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]})
            expect(async).to.have.been.calledOnce
        })
        
        it('emits a pull channel event when a record field is set', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ sync: true }),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [{id: 1}])
            var record = list[0]
            channel.emit = sinon.stub()
            record.set('foo', 'bar')
            expect(channel.emit).to.have.been.calledOnce
            expect(channel.emit).to.have.been.calledWith(
                'pull',
                {
                    id: 1,
                    edits: [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]
                }
            )
        })
        
        it('emits a pull channel event when a record is updated', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                list = coll.find({ sync: true }),
                channel = fake_channel()
            
            service.firstCall.args[2](null, channel)
            channel.emit('initial', [{id: 1}])
            var record = list[0]
            channel.emit = sinon.stub()
            record.update({ foo: 'bar' })
            expect(channel.emit).to.have.been.calledOnce
            expect(channel.emit).to.have.been.calledWith(
                'pull',
                {
                    id: 1,
                    edits: [{ version: 0, other_version: 0, delta: { foo: ['bar'] } }]
                }
            )
        })
    })
    
    describe('create()', function ()
    {
        it('returns a record', function ()
        {
            var coll = new Collection(sinon.stub()),
                record = coll.create({ foo: 'bar' })
            expect(record).to.be.instanceof(Record)
            expect(record.get('foo')).to.equal('bar')
        })
        
        it('calls its service\'s create method', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service)
            
            coll.create({id: 1, foo:'bar'})
            expect(service).to.have.been.calledOnce
            expect(service.firstCall.args[0]).to.equal('create')
            expect(service.firstCall.args[1]).to.deep.equal({ id:1, foo:'bar'})
        })
        
        it('calls its callback with an error if there is a service error', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                done = sinon.spy()
                
            coll.create({}, done)
            service.firstCall.args[2]('some error')
            expect(done).to.have.been.calledOnce
            expect(done).to.have.been.calledWith('some error')
        })
        
        it('calls its callback with the results if there is no error', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                done = sinon.spy()
                
            coll.create({}, done)
            service.firstCall.args[2](null, { id: 1, foo: 'bar' })
            expect(done).to.have.been.calledOnce
            expect(done.firstCall.args[0]).to.be.null
            expect(done.firstCall.args[1]).to.deep.equal({ id: 1, foo: 'bar' })
        })
        
        it('adds an id if fields doesn\'t already have one', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service)
            
            var fields = { foo: 'bar' }
            coll.create(fields)
            expect(fields.id).to.not.be.undefined
        })
    })
    
    describe('delete()', function ()
    {
        it('returns nothing', function ()
        {
            var coll = new Collection(sinon.stub())
            expect(coll.delete()).to.be.undefined
        })
        
        it('calls its service\'s delete method', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service)
            
            coll.delete(1)
            expect(service).to.have.been.calledOnce
            expect(service.firstCall.args[0]).to.equal('delete')
            expect(service.firstCall.args[1]).to.deep.equal({ id: 1 })
        })
        
        it('calls its callback with an error if there is a service error', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                done = sinon.spy()
                
            coll.delete(1, done)
            service.firstCall.args[2]('some error')
            expect(done).to.have.been.calledOnce
            expect(done).to.have.been.calledWith('some error')
        })
        
        it('calls its callback with the results if there is no error', function ()
        {
            var service = sinon.stub(),
                coll = new Collection(service),
                done = sinon.spy()
                
            coll.delete(1, done)
            service.firstCall.args[2](null, { id: 1 })
            expect(done).to.have.been.calledOnce
            expect(done.firstCall.args[0]).to.be.null
            expect(done.firstCall.args[1]).to.deep.equal(1)
        })
    })
    
    it('keeps references to lists', function ()
    {
        var coll = new Collection(sinon.stub()),
            list = coll.find()
        
        expect(coll.lists).to.not.be.undefined
        expect(coll.lists).to.deep.equal([list])
    })
    
    it('removes referenced lists when they are closed', function ()
    {
        var coll = new Collection(sinon.stub()),
            list = coll.find()
        
        list.emit('close')
        
        expect(coll.lists).to.deep.equal([])
    })
    
    it('adds newly created records to existing lists with matching queries', function ()
    {
        var coll = new Collection(sinon.stub()),
            list_one = coll.find({ index: 'foo', value: 'bar' }),
            list_two = coll.find({ index: 'foo', value: 'baz' })
        
        var record = coll.create({ foo: 'bar' })
        
        expect(list_one.slice(0)).to.deep.equal([record])
        expect(list_two.slice(0)).to.deep.equal([])
    })
    
    it('removes records from existing lists when they are deleted', function ()
    {
        var coll = new Collection(sinon.stub()),
            list_one = coll.find({ index: 'skidoo', value: 23 }),
            list_two = coll.find({ index: 'id', value: 'foo' }),
            list_three = coll.find({ index: 'skidoo', value: 50 }),
            record = coll.create({ id: 'foo', skidoo: 23 })
        
        coll.create({ skidoo: 50 })
        
        expect(list_one.length).to.equal(1)
        expect(list_two.length).to.equal(1)
        expect(list_three.length).to.equal(1)
        
        coll.delete(record.get('id'))
        
        expect(list_one.length).to.equal(0)
        expect(list_two.length).to.equal(0)
        expect(list_three.length).to.equal(1)
    })
})