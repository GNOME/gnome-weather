
from gi.repository import GLib, Cogl, Clutter, Gtk, GdkPixbuf

def clutter_color_from_string(string):
    return Clutter.Color.from_string(string)[1]
