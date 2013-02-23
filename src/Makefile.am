NULL =

nodist_bin_SCRIPTS = gnome-weather

jsdir = $(pkgdatadir)
dist_js_DATA = \
	city.js		\
	forecast.js	\
	main.js		\
	strings.js	\
	util.js		\
	window.js	\
	world.js	\
	$(NULL)

gnome-weather: $(top_builddir)/config.status gnome-weather.in
	$(AM_V_GEN) cd $(top_builddir) && $(SHELL) ./config.status --file $(subdir)/$@
	@chmod +x $@

EXTRA_DIST = gnome-weather.in
DISTCLEANFILES = gnome-weather

include $(top_srcdir)/git.mk
