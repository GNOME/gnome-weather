#! /usr/bin/python

from gi.repository import Gio, GLib

import os, sys
import pyatspi
from dogtail import tree
from dogtail import utils
from dogtail.procedural import *
from testutil import *

def active(widget):
    return widget.getState().contains(pyatspi.STATE_ARMED)
def visible(widget):
    return widget.getState().contains(pyatspi.STATE_VISIBLE)

init()
try:
    app = start()

    new_button = app.child('New')
    back_button = app.child('Back')
    delete_button = app.child('Delete')
    select_button = app.child('Select')
    done_button = app.child('Cancel')
    world_view = app.child('World view')
    city_view = app.child('City view')
    content_view = app.child('Cities')
    milan_icon = content_view.findChild(IsTextEqual('Milan'))

    # basic state
    assert new_button.showing
    assert not back_button.showing
    assert not delete_button.showing
    assert select_button.showing
    assert not done_button.showing
    assert world_view.showing
    assert content_view.showing
    assert not city_view.showing

    # selection mode
    select_button.click()
    assert not new_button.showing
    assert not back_button.showing
    assert delete_button.showing
    assert not delete_button.sensitive
    assert not select_button.showing
    assert done_button.showing
    assert world_view.showing
    assert content_view.showing
    assert not city_view.showing

    # select one
    milan_icon.click()
    assert delete_button.sensitive
    # unselect it
    milan_icon.click()
    assert not delete_button.sensitive

    # back from selection mode
    done_button.click()
    assert new_button.showing
    assert not back_button.showing
    assert not delete_button.showing
    assert select_button.showing
    assert not done_button.showing
    assert world_view.showing
    assert content_view.showing
    assert not city_view.showing

    # back into selection mode, delete the only item
    select_button.click()
    milan_icon.click()
    delete_button.click()
    assert milan_icon.dead
    placeholder = app.child('Add locations').parent
    assert placeholder.showing
    assert select_button.showing
    assert not select_button.sensitive

    # reset
    reset_settings()
    utils.doDelay(1)
    milan_icon = content_view.findChild(IsTextEqual('Milan'))
    assert not milan_icon.dead
    # these two should be equivalend to milan_icon.showing,
    # but for some reason they aren't
    assert visible(milan_icon)
    assert milan_icon.parent.showing

finally:
    fini()

#type("gimp\n")
#doDelay(2)
#keyCombo("Escape")

