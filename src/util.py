
from gi.repository import GLib, Cogl, Clutter, Gtk, GdkPixbuf

def clutter_color_from_string(string):
    col = Clutter.Color()
    col.from_string(string)
    return col
