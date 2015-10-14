'use strict'

var matchfind = require('../lib/matchfind')


describe('matchfind', function ()
{
    it('matches any object with an empty query', function ()
    {
        var foo = { stuff: 'things' },
            bar = { skidoo: 23 }
        
        expect(matchfind(foo, {})).to.be.true
        expect(matchfind(bar, {})).to.be.true
    })
    
    it('matches an equality', function ()
    {
        var foo = { stuff: 'things' }
        expect(matchfind(foo, { index: 'stuff', value: 'things' })).to.be.true
    })
    
    it('does not match an inequality', function ()
    {
        var foo = { stuff: 'things' }
        expect(matchfind(foo, { index: 'stuff', value: 'blarbs' })).to.be.false
    })
    
    it('matches an equality on dates', function ()
    {
        var foo = { stuff: new Date(1444836971216) }
        expect(matchfind(foo, { index: 'stuff', value: new Date(1444836971216) })).to.be.true
    })
    
    it('matches an equality on compound values', function ()
    {
        var foo = { stuff: 'things', skidoo: new Date(1444836971216) },
            value = ['things', new Date(1444836971216)]
        
        expect(matchfind(foo, { index: 'stuff$skidoo', value: value })).to.be.true
    })
    
    it('does not match an equality on compound values', function ()
    {
        var foo = { stuff: 'things', skidoo: new Date(1444836971216) },
            value = ['things', new Date()]
        
        expect(matchfind(foo, { index: 'stuff$skidoo', value: value })).to.be.false
    })
    
    it('matches when in a range with a start and end', function ()
    {
        expect(
            matchfind(
                { stuff: 5 },
                {
                    start: 0,
                    end: 10,
                    index: 'stuff'
                }
            )
        ).to.be.true
    })
    
    it('has default left closed and right open ranges', function ()
    {
        expect(
            matchfind(
                { stuff: 5 },
                {
                    start: 5,
                    end: 10,
                    index: 'stuff'
                }
            )
        ).to.be.true
        
        expect(
            matchfind(
                { stuff: 10 },
                {
                    start: 5,
                    end: 10,
                    index: 'stuff'
                }
            )
        ).to.be.false
    })
    
    it('can set start/end of ranges to closed/open', function ()
    {
        expect(
            matchfind(
                { stuff: 5 },
                {
                    start: 5,
                    end: 10,
                    index: 'stuff',
                    left: 'open'
                }
            )
        ).to.be.false
        
        expect(
            matchfind(
                { stuff: 10 },
                {
                    start: 5,
                    end: 10,
                    index: 'stuff',
                    right: 'closed'
                }
            )
        ).to.be.true
    })
    
    it('can match a range with a compound value', function ()
    {
        expect(
            matchfind(
                { stuff: 'd', things: 'e' },
                {
                    start: ['a','z'],
                    end: ['d','f'],
                    index: 'stuff$things'
                }
            )
        ).to.be.true
    })
})