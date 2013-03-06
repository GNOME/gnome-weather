resource_files = $(shell $(GLIB_COMPILE_RESOURCES) --sourcedir=$(srcdir) --generate-dependencies $(srcdir)/gnome-weather.gresource.xml)
gnome-weather.gresource: gnome-weather.gresource.xml $(resource_files)
	$(AM_V_GEN) $(GLIB_COMPILE_RESOURCES) --target=$@ --sourcedir=$(srcdir) $<

resourcedir = $(pkgdatadir)
resource_DATA = gnome-weather.gresource

appsdir = $(datadir)/applications
apps_DATA = gnome-weather.desktop

@INTLTOOL_DESKTOP_RULE@

gsettings_SCHEMAS = org.gnome.Weather.Application.gschema.xml

@GSETTINGS_RULES@

EXTRA_DIST = \
	gnome-weather.desktop.in \
	gnome-weather.gresource.xml \
	$(gsettings_SCHEMAS) \
	$(resource_files) \
	$(NULL)

CLEANFILES = \
	gnome-weather.gresource \
	$(apps_DATA) \
	*.valid \
	gschemas.compiled \
	$(NULL)

# For uninstalled use
all-local:
	$(GLIB_COMPILE_SCHEMAS) $(builddir)

-include $(top_srcdir)/git.mk
