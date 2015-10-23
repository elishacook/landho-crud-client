'use strict'

function Changeset ()
{
    this.changes = []
}

Changeset.prototype.push = function (change)
{
    this.changes.push(change)
}

Changeset.prototype.abort = function ()
{
    this.changes.forEach(function (change)
    {
        change.target.abort(change.data)
    })
}

Changeset.prototype.commit = function ()
{
    this.changes.forEach(function (change)
    {
        change.target.commit(change.data)
    })
}

Changeset.prototype.undo = function ()
{
    this.changes.forEach(function (change)
    {
        change.target.undo(change.data)
    })
}

Changeset.prototype.redo = function ()
{
    this.changes.forEach(function (change)
    {
        change.target.redo(change.data)
    })
}

var tracking = 
{
    active: null,
    history: [],
    index: -1,
    
    start: function ()
    {
        if (tracking.active)
        {
            tracking.abort()
        }
        
        tracking.active = new Changeset()
    },
    
    push: function (target, data)
    {
        if (tracking.active)
        {
            if (tracking.history.length > 0 &&
                tracking.index < tracking.history.length - 1)
            {
                tracking.history.splice(tracking.index, tracking.history.length - tracking.index)
                tracking.index -= 1
            }
            
            tracking.active.push({
                target: target,
                data: data
            })
        }
    },

    abort: function ()
    {
        if (tracking.active)
        {
            var changeset = tracking.active
            tracking.active = null
            changeset.abort()
        }
    },

    commit: function ()
    {
        if (tracking.active)
        {
            var changeset = tracking.active
            tracking.active = null
            tracking.history.push(changeset)
            changeset.commit()
        }
    },

    has_next: function ()
    {
        return (tracking.history.length > 0 && tracking.index < tracking.history.length - 1)
    },

    has_previous: function ()
    {
        return (-1 < tracking.index)
    },

    next: function ()
    {
        if (!tracking.active && tracking.has_next())
        {
            tracking.index++
            tracking.history[tracking.index].redo()
        }
    },

    previous: function ()
    {
        if (!tracking.active && tracking.has_previous())
        {
            tracking.history[tracking.index].undo()
            tracking.index--
        }
    }
}

tracking.Changeset = Changeset

module.exports = tracking