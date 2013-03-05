cssdir = $(pkgdatadir)
dist_css_DATA = application.css

appsdir = $(datadir)/applications
apps_DATA = gnome-weather.desktop

@INTLTOOL_DESKTOP_RULE@

gsettings_SCHEMAS = org.gnome.Weather.Application.gschema.xml

@GSETTINGS_RULES@

EXTRA_DIST = gnome-weather.desktop.in $(gsettings_SCHEMAS)
CLEANFILES = $(apps_DATA) *.valid gschemas.compiled

# For uninstalled use
all-local:
	$(GLIB_COMPILE_SCHEMAS) $(builddir)

-include $(top_srcdir)/git.mk
