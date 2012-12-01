NULL =

bin_SCRIPTS = gnome-weather

gnome-weather: gnome-weather.in Makefile
	$(AM_V_GEN) sed -e "s|[@]PYTHON@|$(PYTHON)|g"   \
	                -e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
	                -e "s|[@]pkglibdir@|$(pkglibdir)|g" \
	                -e "s|[@]GETTEXT_PACKAGE@|$(GETTEXT_PACKAGE)|g" \
	                -e "s|[@]localedir@|$(datadir)/locale|g" \
	                $< > $@
	@chmod +x $@

pydir = $(pkglibdir)
dist_py_PYTHON = \
	__init__.py	\
	app.py		\
	util.py		\
	widget.py	\
	forecast.py 	\
	conditions.py	\
	strings.py	\
	$(NULL)

pkguidir = $(pkgdatadir)/ui
dist_pkgui_DATA = \
	ui/custom.css

dist_noinst_DATA = gnome-weather.in
CLEANFILES = gnome-weather
