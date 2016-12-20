AC_PREREQ(2.63)
AC_INIT([org.gnome.Weather],[3.20.2],
	[https://bugzilla.gnome.org/enter_bug.cgi?product=gnome-weather],
	[gnome-weather],
	[https://wiki.gnome.org/Apps/Weather])

AC_CONFIG_MACRO_DIR([m4])
AX_IS_RELEASE([minor-version])

AM_INIT_AUTOMAKE([1.12 dist-xz no-dist-gzip foreign tar-ustar no-define serial-tests -Wno-portability])
# revert automake using PACKAGE_TARNAME instead of PACKAGE_NAME
AC_SUBST([PACKAGE], [$PACKAGE_NAME])

AM_SILENT_RULES([yes])

GETTEXT_PACKAGE=$PACKAGE_NAME
AC_SUBST(GETTEXT_PACKAGE)
IT_PROG_INTLTOOL(0.26)
AC_PROG_LN_S

PKG_PROG_PKG_CONFIG([0.22])

AX_REQUIRE_DEFINED([APPSTREAM_XML])
APPSTREAM_XML
AX_REQUIRE_DEFINED([GLIB_GSETTINGS])
GLIB_GSETTINGS
AX_REQUIRE_DEFINED([GOBJECT_INTROSPECTION_REQUIRE])
GOBJECT_INTROSPECTION_REQUIRE([1.35.9])
GJS_MIN_VERSION=1.39.91
PKG_CHECK_MODULES([DEPS], [gdk-3.0
                           gdk-pixbuf-2.0
                           gio-2.0
                           glib-2.0 >= 2.48
                           gobject-2.0
                           gtk+-3.0 >= 3.11.4
                           libgeoclue-2.0 >= 2.3.1
                           gjs-1.0 >= $GJS_MIN_VERSION
                           gweather-3.0 >= 3.17.2])

AC_PATH_PROG([GJS],[gjs])

AC_ARG_ENABLE(dogtail,
              [AS_HELP_STRING([--enable-dogtail],
                              [test using dogtail [default=yes]])],,
              enable_dogtail=yes)
AM_CONDITIONAL(ENABLE_DOGTAIL, test "$enable_dogtail" != no)
# coverage
AC_ARG_ENABLE([coverage],
              [AS_HELP_STRING([--enable-coverage],
                              [enable code coverage])],
              , [enable_coverage=no])
if test x$enable_coverage = xyes; then
    AC_PATH_TOOL([LCOV], [lcov])
    AC_PATH_TOOL([GENHTML], [genhtml])

    if test x$LCOV = x || test x$GENHTML = x; then
        AC_MSG_ERROR([lcov and genhtml are required for --enable-coverage])
    fi
fi
AM_CONDITIONAL([ENABLE_COVERAGE], [test x$enable_coverage = xyes])

GLIB_TESTS

GLIB_COMPILE_RESOURCES=`$PKG_CONFIG --variable glib_compile_resources gio-2.0`
AC_SUBST(GLIB_COMPILE_RESOURCES)

AC_CONFIG_FILES([
  Makefile
  data/Makefile
  data/icons/Makefile
  src/Makefile
  tests/Makefile
  po/Makefile.in
])
AC_OUTPUT
