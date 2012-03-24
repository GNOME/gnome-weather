
INTROSPECTION_GIRS =
CLEANFILES =

lib_LTLIBRARIES = libgweather-ui.la

libgweather_ui_la_SOURCES = \
	gweather-ui-util.h \
	gweather-ui-util.c

libgweather_ui_la_LIBADD = $(GWEATHER_LIBS)
libgweather_ui_la_CFLAGS = $(GWEATHER_CFLAGS)

-include $(INTROSPECTION_MAKEFILE)
GWeatherUI-0.1.gir: libgweather-ui.la
GWeatherUI_0_1_gir_INCLUDES = Gtk-3.0 Clutter-1.0 GWeather-3.0 GdkPixbuf-2.0 Gio-2.0
GWeatherUI_0_1_gir_CFLAGS = $(libgweather_ui_la_CPPFLAGS) -I $(srcdir)
GWeatherUI_0_1_gir_LIBS = libgweather-ui.la
GWeatherUI_0_1_gir_FILES = $(libgweather_ui_la_SOURCES)
GWeatherUI_0_1_gir_SCANNERFLAGS = --identifier-prefix=GWeatherUI --symbol-prefix=gweather_ui
INTROSPECTION_GIRS += GWeatherUI-0.1.gir
CLEANFILES += GWeatherUI-0.1.gir

typelibdir = $(pkglibdir)
typelib_DATA = GWeatherUI-0.1.typelib
