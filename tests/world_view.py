#! /usr/bin/python

from testutil import *

from gi.repository import Gio, GLib

import os, sys
import pyatspi
from dogtail import tree
from dogtail import utils
from dogtail.procedural import *


def active(widget):
    return widget.getState().contains(pyatspi.STATE_ARMED)


def visible(widget):
    return widget.getState().contains(pyatspi.STATE_VISIBLE)


init()
try:
    app = start()

    places_button = app.child('Places')
    refresh_button = app.child('Refresh')
    world_view = app.child('World view')
    city_view = app.child('City view')

    current_conditions = app.child('Current conditions')
    weekly_forecast = app.child('Weekly Forecast')
    forecast = app.child('Forecast')

    # basic state
    assert places_button.showing
    assert refresh_button.showing
    assert not world_view.showing
    assert city_view.showing

    # forecast
    assert current_conditions.showing
    assert weekly_forecast.showing
    assert forecast.showing


finally:
    fini()

# type("gimp\n")
# doDelay(2)
# keyCombo("Escape")

