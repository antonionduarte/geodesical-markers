/* 
Rede Geodésica Nacional

Aluno 1: Gonçalo Virgínia - 56773
Aluno 2: Antonio Duarte - 58278

Comentario:

HTML DOM documentation: https://www.w3schools.com/js/js_htmldom.asp
Leaflet documentation: https://leafletjs.com/reference-1.7.1.html
*/

/* Global Constants */

const MAP_CENTRE = [38.661, -9.2044]; // FCT coordinates

const MAP_ID = "mapid";

const MAP_ATTRIBUTION =
	'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
	'contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>';

const MAP_URL =
	"https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=" +
	"pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw";
	
	"https://upload.wikimedia.org/wikipedia/commons/e/e0/SNice.svg";

const MAP_ERROR =
"https://upload.wikimedia.org/wikipedia/commons/e/e0/SNice.svg";


const MAP_LAYERS = [
	"streets-v11",
	"outdoors-v11",
	"light-v10",
	"dark-v10",
	"satellite-v9",
	"satellite-streets-v11",
	"navigation-day-v1",
	"navigation-night-v1",
];
const RESOURCES_DIR = "resources/";

const VG_ORDERS = ["order1", "order2", "order3", "order4"];

const RGN_FILE_NAME = "rgn.xml";

/* Global Variables */

let map;

/* Useful Functions */

// Capitalize the first letter of a string.
function capitalize(str) {
	return str.length > 0 ? str[0].toUpperCase() + str.slice(1) : str;
}

// Distance in km between to pairs of coordinates over the earth's surface.
// https://en.wikipedia.org/wiki/Haversine_formula
function haversine(lat1, lon1, lat2, lon2) {
	function toRad(deg) {
		return (deg * 3.1415926535898) / 180.0;
	}
	let dLat = toRad(lat2 - lat1),
		dLon = toRad(lon2 - lon1);
	let sa = Math.sin(dLat / 2.0),
		so = Math.sin(dLon / 2.0);
	let a = sa * sa + so * so * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
	return 6372.8 * 2.0 * Math.asin(Math.sqrt(a));
}

function loadXMLDoc(filename) {
	let xhttp = new XMLHttpRequest();
	xhttp.open("GET", filename, false);
	try {
		xhttp.send();
	} catch (err) {
		alert(
			"Could not access the local geocaching database via AJAX.\n" +
			"Therefore, no POIs will be visible.\n"
		);
	}
	return xhttp.responseXML;
}

function getAllValuesByTagName(xml, name) {
	return xml.getElementsByTagName(name);
}

function getFirstValueByTagName(xml, name) {
	return getAllValuesByTagName(xml, name)[0].childNodes[0].nodeValue;
}

function between(x, y, z) {
	return x >= y && x <= z;
}

function loadRGN(filename) {
	let xmlDoc = loadXMLDoc(filename);
	let xs = getAllValuesByTagName(xmlDoc, "vg");
	let vgs = [];

	for (let order in VG_ORDERS) {
		vgs.push([]);
	}

	if (xs.length == 0) {
		alert("Empty file");
	}

	else {
		for (let i = 0; i < xs.length; i++) {
			let name = getFirstValueByTagName(xs[i], "name"),
					type = getFirstValueByTagName(xs[i], "type"),
					altitude = getFirstValueByTagName(xs[i], "altitude"),
					latitude = getFirstValueByTagName(xs[i], "latitude"),
					longitude = getFirstValueByTagName(xs[i], "longitude");

			switch (getFirstValueByTagName(xs[i], "order")) {
				case '1':
					vgs[0].push(new VG1(name, type, altitude, latitude, longitude));
					break;
				case '2':
					vgs[1].push(new VG2(name, type, altitude, latitude, longitude));
					break;
				case '3':
					vgs[2].push(new VG3(name, type, altitude, latitude, longitude));
					break;
				case '4':
					vgs[3].push(new VG4(name, type, altitude, latitude, longitude));
					break;
			}
		}
	}

	return vgs;
}

/* Loads the icons */
function loadIcons(dir) {
	let icons = [];

	let iconOptions = {
		iconUrl: "??",
		shadowUrl: "??",
		iconSize: [16, 16],
		shadowSize: [16, 16],
		iconAnchor: [8, 8],
		shadowAnchor: [8, 8],
		popupAnchor: [0, -6], // offset the determines where the popup should open
	};

	for (let i = 0; i < VG_ORDERS.length; i++) {
		iconOptions.iconUrl = dir + VG_ORDERS[i] + ".png";
		icons[VG_ORDERS[i]] = L.icon(iconOptions);
	}

	return icons;
}

/* POI */

class POI {
	constructor(name, latitude, longitude) {
		this.name = name;
		this.latitude = latitude;
		this.longitude = longitude;
	}
}

class VG extends POI {
	constructor(name, order, type, altitude, latitude, longitude) {
		super(name, latitude, longitude);
		this.order = order;
		this.type = type;
		this.altitude = altitude;
	}

	distanceTo(other) {
		return haversine(this.latitude, this.longitude, other.latitude, other.longitude);
	}
}

class VG1 extends VG {
	constructor(name, type, altitude, latitude, longitude) {
		super(name, 1, type, altitude, latitude, longitude);
	}

	validDistance(other) {
		return between(this.distanceTo(other), 30, 60);
	}
}

class VG2 extends VG {
	constructor(name, type, altitude, latitude, longitude) {
		super(name, 2, type, altitude, latitude, longitude);
	}

	validDistance(other) {
		return between(this.distanceTo(other), 20, 30);
	}
}

class VG3 extends VG {
	constructor(name, type, altitude, latitude, longitude) {
		super(name, 3, type, altitude, latitude, longitude);
	}

	validDistance(other) {
		return between(this.distanceTo(other), 5, 10);
	}
}

class VG4 extends VG {
	constructor(name, type, altitude, latitude, longitude) {
		super(name, 4, type, altitude, latitude, longitude);
	}
}

/* Map */

class Map {
	constructor(center, zoom) {
		this.lmap = L.map(MAP_ID).setView(center, zoom); // creates the map with the specific view
		this.addBaseLayers(MAP_LAYERS); // the several different "map styles", such as satellite, streets etc ...
		this.icons = loadIcons(RESOURCES_DIR); // loads the icons
		this.vgs = loadRGN(RESOURCES_DIR + RGN_FILE_NAME); // loads the VGs | TODO: probably needs to work differently?
		this.populate(this.icons, this.vgs); // populates everything with VGs and their respective markers
		this.addClickHandler((e) => L.popup().setLatLng(e.latlng).setContent("You clicked the map at " + e.latlng.toString()));
	}

	/* Configures a specific map layer */
	makeMapLayer(name, spec) {
		let urlTemplate = MAP_URL;
		let attr = MAP_ATTRIBUTION;
		let errorTileUrl = MAP_ERROR;
		let layer = L.tileLayer(urlTemplate, {
			minZoom: 6,
			maxZoom: 19,
			errorTileUrl: errorTileUrl,
			id: spec,
			tileSize: 512,
			zoomOffset: -1,
			attribution: attr,
		});
		return layer;
	}

	/* Adds te base map/tile layers */
	addBaseLayers(specs) {
		let baseMaps = [];

		for (let i in specs) {
			baseMaps[capitalize(specs[i])] = this.makeMapLayer(
				specs[i],
				"mapbox/" + specs[i]
			);
		}

		baseMaps[capitalize(specs[0])].addTo(this.lmap);

		L.control
			.scale({ maxWidth: 150, metric: true, imperial: false })
			.setPosition("topleft")
			.addTo(this.lmap);

		L.control.layers(baseMaps, {}).setPosition("topleft").addTo(this.lmap);
		return baseMaps;
	}

	/* Populates the map with all icons and VGs */
	populate(icons, vgs) {
		for (let i in vgs) {
			let order = vgs[i]
			for (let j in order) {
				this.addMarker(icons, order[j]);
			}
		}
	}

	addMarker(icons, vg) {
		let marker = L.marker([vg.latitude, vg.longitude], {
			icon: icons["order" + vg.order],
		});
		
		marker.bindPopup(
			"I'm the marker of VG <b>" +
          	vg.name +
          	"</b>.<br/>" +
          	"<b>Order:</b> " +
          	vg.order +
          	"<br/><b>Type:</b> " +
          	vg.type +
		  	"<br/><b>Altitude:</b> " +
          	vg.altitude +
          	"<br/><b>Latitude:</b> " +
          	vg.latitude +
          	"<br/><b>Longitude:</b> " +
          	vg.longitude
     	).bindTooltip(vg.name)
       .addTo(this.lmap);
	}

	addClickHandler(handler) {
		let m = this.lmap;
		function handler2(e) {
			return handler(e).openOn(m);
		}
		return this.lmap.on("click", handler2);
	}

	addCircle(pos, radius, popup) {
		let circle = L.circle(pos, radius, {
			color: "red",
			fillColor: "pink",
			fillOpacity: 0.4,
		});
		circle.addTo(this.lmap);
		if (popup != "") {
			circle.bindPopup(popup);
		}
		return circle;
	}
}

/* Functions for HTML */

function onLoad() {
	map = new Map(MAP_CENTRE, 12);
	map.addCircle(MAP_CENTRE, 100, "FCT/UNL");
}

function updateVisibleLayers(order) {

}

function numVisibleMarkers() {

}
