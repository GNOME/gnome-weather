
from gi.repository import GLib, Gio, GtkClutter
# HACK: GtkClutter must be initialized before Gtk is loaded
GtkClutter.init(None)
from gi.repository import Gtk, GWeather
from gettext import gettext as _
import widget

class GnomeWeatherApp(Gtk.Application):
    def __init__(self):
        super().__init__(application_id='org.gnome.WeatherApp')
        self.connect('startup', self.on_startup.__func__)
        self.connect('activate', self.on_activate.__func__)

    def set_location(self, location=None):
        self._widget.begin_update()
        self.info.set_location(location)
        self.window.props.title = self._make_title(location)

    def _make_title(self, location=None):
        if location is None:
            location = self.info.get_location()
        city = location
        if location.get_level() == GWeather.LocationLevel.WEATHER_STATION:
            city = location.get_parent()
        nation = city
        while nation and nation.get_level() != GWeather.LocationLevel.COUNTRY:
            nation = nation.get_parent()

        if nation and nation is not city:
            return city.get_name() + ', ' + nation.get_name()
        else:
            return city.get_name()

    def _build_ui(self):
        self.window = Gtk.ApplicationWindow(application=self,
                                            title=self._make_title())
        self.window.set_size_request(700, 500)

        grid = Gtk.Grid(orientation=Gtk.Orientation.VERTICAL, visible=True)

        toolbar = Gtk.Toolbar(visible=True)
        toolbar.get_style_context().add_class(Gtk.STYLE_CLASS_PRIMARY_TOOLBAR)

        self._locationbar = widget.LocationEntryItem(self.world, self.info.get_location(), visible=True)
        self._locationbar.connect('notify::location', self._locationbar_changed)
        toolbar.add(self._locationbar)
        grid.add(toolbar)
        self.window.add(grid)

        self._widget = widget.WeatherWidget(self.info)
        grid.add(self._widget)

    def _locationbar_changed(self, entry, pspec):
        self.set_location(entry.get_location())

    def on_startup(self):
        self.world = GWeather.Location.new_world(False)
        self.info = GWeather.Info(world=self.world, forecast_type=GWeather.ForecastType.LIST)

        self._build_ui()

    def on_activate(self):
        self.window.present()
