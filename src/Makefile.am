bin_SCRIPTS = gnome-weather

gnome-weather: gnome-weather.in Makefile
	$(AM_V_GEN) sed -e "s|[@]PYTHON@|$(PYTHON)|g"   \
	                -e "s|[@]pkgdatadir@|$(pkgdatadir)|g" \
	                -e "s|[@]pkglibdir@|$(pkglibdir)|g" \
	                $< > $@
	@chmod +x $@

pkgdata_DATA = \
	__init__.py	\
	app.py		\
	util.py		\
	widget.py
