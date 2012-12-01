AC_PREREQ(2.63)
AC_INIT([gnome-weather],[0.1],[https://github.com/gcampax/gnome-weather])

AC_CONFIG_HEADERS([config.h])
AC_CONFIG_MACRO_DIR([m4])
AC_CONFIG_AUX_DIR([config])

AM_INIT_AUTOMAKE([1.10 dist-bzip2 no-dist-gzip foreign tar-ustar])

m4_ifdef([AM_SILENT_RULES],[AM_SILENT_RULES([yes])])

GETTEXT_PACKAGE=gnome-weather
AC_SUBST(GETTEXT_PACKAGE)
AC_DEFINE_UNQUOTED(GETTEXT_PACKAGE, "$GETTEXT_PACKAGE",
                   [The prefix for our gettext translation domains.])
IT_PROG_INTLTOOL(0.26)

AC_PROG_CC
AM_PROG_CC_C_O
LT_INIT

PKG_PROG_PKG_CONFIG([0.22])

PKG_CHECK_MODULES([GWEATHER], [gtk+-3.0 clutter-1.0 gdk-pixbuf-2.0 gio-2.0 gweather-3.0 >= 3.5.0])

GLIB_GSETTINGS
GOBJECT_INTROSPECTION_REQUIRE([1.30.0])

AM_PATH_PYTHON([3.0])

AC_CONFIG_FILES([
  Makefile
  data/Makefile
  src/Makefile
  po/Makefile.in
])
AC_OUTPUT
