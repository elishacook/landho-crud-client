'use strict'

var Collection = require('../lib/collection'),
    records = require('../lib/records'),
    lists = require('../lib/lists'),
    watch = require('../lib/watch')


describe('Collection', function ()
{
    it('throws an error if not instantiated with a service', function ()
    {
        expect(function ()
        {
            var things = new Collection()
        }).to.throw('A service is required')
    })
    
    describe('get()', function ()
    {
        it('can return a DumbRecord', function ()
        {
            var things = new Collection(true, { methods: { foo: function () { return 123 } } }),
                record = things.get('123')
            
            expect(record).to.be.instanceof(records.DumbRecord)
            expect(record.get('id')).to.equal('123')
            expect(record.foo()).to.equal(123)
        })
        
        it('can return a WatchRecord', function ()
        {
            var things = new Collection(true, { methods: { foo: function () { return 123 } } }),
                record = things.get('123', { watch: true })
            
            expect(record).to.be.instanceof(records.WatchRecord)
            expect(record.get('id')).to.equal('123')
            expect(record.foo()).to.equal(123)
        })
        
        it('can return a SyncRecord', function ()
        {
            var things = new Collection(true, { methods: { foo: function () { return 123 } } }),
                record = things.get('123', { sync: true })
            
            expect(record).to.be.instanceof(records.SyncRecord)
            expect(record.get('id')).to.equal('123')
            expect(record.foo()).to.equal(123)
        })
        
        it('adds the record to the current watcher', function ()
        {
            watch.watcher = { push: sinon.stub() }
            
            var things = new Collection(true),
                record = things.get('123')
            
            expect(watch.watcher.push).to.have.been.calledOnce
            expect(watch.watcher.push.args[0][0].fields).to.deep.equal({id:'123'})
            
            watch.watcher = null
        })
    })
    
    describe('create()', function ()
    {
        it('adds an id if one isn\'t already set', function ()
        {
            var things = new Collection(function () {}),
                record = things.create({})
            expect(record.get('id')).to.not.be.undefined
        })
        
        it('does not set id if one is already set', function ()
        {
            var things = new Collection(function () {}),
                record = things.create({ id: 'foo' })
            expect(record.get('id')).to.equal('foo')
        })
        
        it('returns a SyncRecord if there are no cached records', function ()
        {
            var things = new Collection(function () {}),
                record = things.create({ shoes: 'shiny' })
            expect(record).to.be.instanceof(records.SyncRecord)
            expect(record.get('shoes')).to.equal('shiny')
        })
        
        it('calls its service\'s create method', function ()
        {
            var things = new Collection(sinon.stub()),
                record = things.create({ shoes: 'shiny' })
            
            expect(things.service).to.have.been.calledOnce
            expect(things.service.args[0][0]).to.equal('create')
            expect(things.service.args[0][1]).to.deep.equal({'shoes':'shiny', id: record.get('id')})
        })
        
        it('sets the record\'s error property if the create call fails', function ()
        {
            var service = sinon.stub().callsArgWith(2, 'some error'),
                things = new Collection(service),
                record = things.create({ shoes: 'shiny' })
            
            expect(record.error).to.equal('some error')
        })
        
        it('returns a sync record if one is available', function ()
        {
            var things = new Collection(function () {})
            things.get_list_cache.foo = { options: {}, add: sinon.stub().returns('dumb') }
            things.watch_list_cache.foo = { options: {}, add: sinon.stub().returns('watch') }
            things.sync_list_cache.foo = { options: {}, add: sinon.stub().returns('sync') }
            
            var record = things.create({})
            expect(record).to.equal('sync')
        })
        
        it('returns a watch record if no sync record is available', function ()
        {
            var things = new Collection(function () {})
            things.get_list_cache.foo = { options: {}, add: sinon.stub().returns('dumb') }
            things.watch_list_cache.foo = { options: {}, add: sinon.stub().returns('watch') }
            
            var record = things.create({})
            expect(record).to.equal('watch')
        })
        
        it('returns a dumb record if no watch record is available', function ()
        {
            var things = new Collection(function () {})
            things.get_list_cache.foo = { options: {}, add: sinon.stub().returns('dumb') }
            
            var record = things.create({})
            expect(record).to.equal('dumb')
        })
        
        it('adds the list that matched the record to the watcher', function ()
        {
            watch.watcher = { push: sinon.stub() }
            
            var things = new Collection(function () {})
            things.sync_list_cache.foo = { options: {}, add: sinon.stub().returns('sync') }
            
            var record = things.create({})
            expect(watch.watcher.push).to.have.been.calledOnce
            expect(watch.watcher.push).to.have.been.calledWith(things.sync_list_cache.foo)
            
            watch.watcher = null
        })
        
        it('adds the SyncRecord to the watcher if no list is matched', function ()
        {
            watch.watcher = { push: sinon.stub() }
            
            var things = new Collection(function () {}),
                record = things.create()
            
            expect(watch.watcher.push).to.have.been.calledOnce
            expect(watch.watcher.push).to.have.been.calledWith(record)
            
            watch.watcher = null
        })
        
        it('uses default fields if none are passed', function ()
        {
            var things = new Collection(function () {}, { fields: { foo: 'bar' } }),
                record = things.create()
            
            expect(record.get('foo')).to.equal('bar')
        })
    })

    describe('find()', function ()
    {
        it('can return a DumbList', function ()
        {
            var things = new Collection(true),
                list = things.find({ foo: 'bar' })
            
            expect(list).to.be.instanceof(lists.DumbList)
            expect(list.options).to.deep.equal({ foo: 'bar' })
        })
        
        it('can return a WatchList', function ()
        {
            var things = new Collection(true),
                list = things.find({ foo: 'bar', watch: true })
            
            expect(list).to.be.instanceof(lists.WatchList)
            expect(list.options).to.deep.equal({ foo: 'bar', watch: true })
        })
        
        it('can return a SyncList', function ()
        {
            var things = new Collection(true),
                list = things.find({ foo: 'bar', sync: true })
            
            expect(list).to.be.instanceof(lists.SyncList)
            expect(list.options).to.deep.equal({ foo: 'bar', sync: true })
        })
        
        it('adds the list to the current watcher', function ()
        {
            watch.watcher = { push: sinon.stub() }
            
            var things = new Collection(true),
                list = things.find({ foo: 'bar' })
            
            expect(watch.watcher.push).to.have.been.calledOnce
            expect(watch.watcher.push.args[0][0]).to.equal(list)
            
            watch.watcher = null
        })
        
        it('will return a cached list', function ()
        {
            var things = new Collection(true),
                dumb_key = things.cache_key({foo: 'bar'}),
                watch_key = things.cache_key({foo: 'bar', watch: true}),
                sync_key = things.cache_key({foo: 'bar', sync: true})
            
            things.get_list_cache[dumb_key] = 'dumb'
            things.watch_list_cache[watch_key] = 'watch'
            things.sync_list_cache[sync_key] = 'sync'
            
            var dumb_list = things.find({foo: 'bar'}),
                watch_list = things.find({foo: 'bar', watch: true}),
                sync_list = things.find({foo: 'bar', sync: true})
                
            expect(dumb_list).to.equal('dumb')
            expect(watch_list).to.equal('watch')
            expect(sync_list).to.equal('sync')
        })
    })
})