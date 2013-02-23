cssdir = $(pkgdatadir)
css_DATA = application.css

appsdir = $(datadir)/applications
apps_DATA = gnome-weather.desktop

@INTLTOOL_DESKTOP_RULE@

EXTRA_DIST = gnome-weather.desktop.in
CLEANFILES = $(apps_DATA)

include $(top_srcdir)/git.mk
