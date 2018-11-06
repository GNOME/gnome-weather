source_conf = configuration_data()
source_conf.set('GJS', find_program('gjs').path())
source_conf.set('DATA_DIR', DATA_DIR)
source_conf.set('PACKAGE_VERSION', meson.project_version())
source_conf.set('libdir', EXTENSION_DIR)
source_conf.set('prefix', prefix)

configure_file(
	input: application_id + '.Application.in',
	output: application_id + '.Application',
	configuration: source_conf,
	install: true,
	install_dir: DATA_DIR
)

configure_file(
	input: application_id + '.BackgroundService.in',
	output: application_id + '.BackgroundService',
	configuration: source_conf,
	install: true,
	install_dir: DATA_DIR
)

gnome.compile_resources(
	application_id + '.Application.src',
	application_id + '.Application.src.gresource.xml',
	gresource_bundle: true,
	install: true,
	install_dir: DATA_DIR
)

gnome.compile_resources(
	application_id + '.BackgroundService.src',
	application_id + '.BackgroundService.src.gresource.xml',
	gresource_bundle: true,
	install: true,
	install_dir: DATA_DIR
)
