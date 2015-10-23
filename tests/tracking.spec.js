'use strict'

var tracking = require('../lib/tracking')

describe('tracking', function ()
{
    afterEach(function ()
    {
        tracking.abort()
    })
    
    it('is not active by default', function ()
    {
        expect(tracking.active).to.be.null
    })
    
    describe('start()', function ()
    {
        it('activates tracking', function ()
        {
            tracking.start()
            expect(tracking.active).to.not.be.null
            expect(tracking.active).to.be.instanceof(tracking.Changeset)
        })
        
        it('aborts existing changeset', function ()
        {
            var abort = sinon.stub()
            tracking.start()
            tracking.active.abort = abort 
            tracking.start()
            expect(abort).to.have.been.calledOnce
        })
    })
    
    describe('push()', function ()
    {
        it('does nothing if tracking was not started', function ()
        {
            tracking.push(123)
            expect(tracking.active).to.be.null
        })
        
        it('pushes changes into the active changeset', function ()
        {
            tracking.start()
            tracking.active.push = sinon.spy()
            tracking.push('foo', 123)
            expect(tracking.active.push).to.have.been.calledOnce
            expect(tracking.active.push).to.have.been.calledWith({ target: 'foo', data: 123 })
            tracking.active = null
        })
        
        it('removes historical changes beyond the current history index', function ()
        {
            tracking.history = [1,2,3,4]
            tracking.index = 2
            
            tracking.start()
            tracking.push('foo', 123)
            expect(tracking.history).to.deep.equal([1,2])
            expect(tracking.index).to.equal(1)
            
            tracking.active = null
            tracking.index = -1
            tracking.history = []
        })
    })
    
    describe('abort()', function ()
    {
        it('does nothing if tracking was not started', function ()
        {
            tracking.abort()
        })
        
        it('calls the active changeset\'s abort method', function ()
        {
            var abort = sinon.stub()
            tracking.start()
            tracking.active.abort = abort
            tracking.abort()
            expect(abort).to.have.been.calledOnce
        })
        
        it('removes the active changeset', function ()
        {
            tracking.start()
            tracking.abort()
            expect(tracking.active).to.be.null
        })
    })
    
    describe('commit()', function ()
    {
        it('does nothing if tracking was not started', function ()
        {
            tracking.commit()
        })
        
        it('calls the active changeset\'s commit method', function ()
        {
            var commit = sinon.stub()
            tracking.start()
            tracking.active.commit = commit
            tracking.commit()
            expect(commit).to.have.been.calledOnce
        })
        
        it('removes the active changeset', function ()
        {
            tracking.start()
            tracking.commit()
            expect(tracking.active).to.be.null
        })
    })
    
    describe('has_next()', function ()
    {
        it('returns false if there is no history', function ()
        {
            tracking.history = []
            expect(tracking.has_next()).to.be.false
        })
        
        it('returns false if the index is at the end of the history', function ()
        {
            tracking.history = [1,2,3]
            tracking.index = 2
            expect(tracking.has_next()).to.be.false
            tracking.history = []
            tracking.index = -1
        })
        
        it('returns true if the index is less than end of the history', function ()
        {
            tracking.history = [1,2,3]
            tracking.index = 1
            expect(tracking.has_next()).to.be.true
            tracking.history = []
            tracking.index = -1
        })
    })
    
    describe('has_previous()', function ()
    {
        it('returns false if there is no history', function ()
        {
            tracking.history = []
            expect(tracking.has_previous()).to.be.false
        })
        
        it('returns false if the index is at the beginning of the history', function ()
        {
            tracking.history = [1,2,3]
            tracking.index = -1
            expect(tracking.has_previous()).to.be.false
            tracking.history = []
            tracking.index = -1
        })
        
        it('returns true if the index is greater than 0', function ()
        {
            tracking.history = [1,2,3]
            tracking.index = 1
            expect(tracking.has_previous()).to.be.true
            tracking.history = []
            tracking.index = -1
        })
    })
    
    describe('next()', function ()
    {
        it('does nothing if there is no history', function ()
        {
            tracking.next()
        })
        
        it('does nothing if the index is at the end of the history', function ()
        {
            tracking.history = [1,2,3]
            tracking.index = 2
            tracking.next()
            expect(tracking.index).to.equal(2)
            expect(tracking.history).to.deep.equal([1,2,3])
            tracking.history = []
            tracking.index = -1
        })
        
        it('calls redo on the next changeset and increments the index', function ()
        {
            tracking.history = [1,2,{ redo: sinon.stub() },3]
            tracking.index = 1
            tracking.next()
            expect(tracking.index).to.equal(2)
            expect(tracking.history[2].redo).to.have.been.calledOnce
            tracking.history = []
            tracking.index = -1
        })
    })
    
    describe('previous()', function ()
    {
        it('does nothing if there is no history', function ()
        {
            tracking.previous()
        })
        
        it('does nothing if the index is at the beginning', function ()
        {
            tracking.history = [1,2,3]
            tracking.index = -1
            tracking.previous()
            expect(tracking.index).to.equal(-1)
            expect(tracking.history).to.deep.equal([1,2,3])
            tracking.history = []
            tracking.index = -1
        })
        
        it('calls undo on the current changeset and decrements the index', function ()
        {
            tracking.history = [1,2,{ undo: sinon.stub() },3]
            tracking.index = 2
            tracking.previous()
            expect(tracking.index).to.equal(1)
            expect(tracking.history[2].undo).to.have.been.calledOnce
            tracking.history = []
            tracking.index = -1
        })
    })
})