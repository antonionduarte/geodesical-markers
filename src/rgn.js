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
	"navigation-night-v1",
	"streets-v11",
	"outdoors-v11",
	"light-v10",
	"dark-v10",
	"satellite-v9",
	"satellite-streets-v11",
	"navigation-day-v1",
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
	let vgOrders = [];

	for (let order in VG_ORDERS) {
		vgOrders.push(new VGOrderCollection());
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
					vgOrders[0].addVG(new VG1(name, type, altitude, latitude, longitude));
					break;
				case '2':
					vgOrders[1].addVG(new VG2(name, type, altitude, latitude, longitude));
					break;
				case '3':
					vgOrders[2].addVG(new VG3(name, type, altitude, latitude, longitude));
					break;
				case '4':
					vgOrders[3].addVG(new VG4(name, type, altitude, latitude, longitude));
					break;
			}
		}
	}

	return vgOrders;
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

/* Collections */

class VGOrderCollection {
	constructor() {
		this.vgs = [];
		this.visible = true;
		this.lowestVG = null;
		this.highestVG = null;
	}

	addVG(vg) {
		this.vgs.push(vg);

		if (!isNaN(vg.altitude)) {
			if ((this.highestVG == null) || (vg.altitude > this.highestVG.altitude)) {
				this.highestVG = vg;
			}
	
			if ((this.lowestVG == null) || (vg.altitude < this.lowestVG.altitude)) {
				this.lowestVG = vg;
			}
		}
	}
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
		this.marker;
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
		this.vgOrders = loadRGN(RESOURCES_DIR + RGN_FILE_NAME);
		this.vgLayerGroups = [];
		this.numVisibleMarkers = 0;
		this.lowestVG = null;
		this.highestVG = null;	
		
		for (let order in VG_ORDERS) {
			this.numVisibleMarkers += this.vgOrders[order].vgs.length;
			this.vgLayerGroups.push(L.layerGroup());
		}
		
		this.populate(this.icons, this.vgOrders); // populates everything with VGs and their respective markers
		this.addClickHandler((e) => L.popup().setLatLng(e.latlng).setContent("You clicked the map at " + e.latlng.toString()));	
		this.updateStatistics();
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
	populate(icons, vgOrders) {
		for (let i in vgOrders) {
			this.vgLayerGroups[i].addTo(this.lmap);
			for (let j in vgOrders[i].vgs) {
				this.addMarker(icons, vgOrders[i].vgs[j]);
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
     	).bindTooltip(vg.name);

		vg.marker = marker;
		this.vgLayerGroups[vg.order - 1].addLayer(marker);
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

	toggleLayerGroupVisiblity(order) {
		if (this.vgOrders[order].visible) {
			this.lmap.removeLayer(this.vgLayerGroups[order]);
			this.numVisibleMarkers -= this.vgOrders[order].vgs.length;
		}
		else {
			this.lmap.addLayer(this.vgLayerGroups[order]);
			this.numVisibleMarkers += this.vgOrders[order].vgs.length;
		}

		this.vgOrders[order].visible = !this.vgOrders[order].visible;
		this.updateStatistics;
	}

	updateStatistics() {
		let lowestVG = null;
		let highestVG = null;

		for (let order in VG_ORDERS) {
			if (this.vgOrders[order].visible) {
				if (lowestVG == null || this.vgOrders[order].lowestVG.altitude < lowestVG.altitude) {
					lowestVG = this.vgOrders[order].lowestVG;
				}
	
				if (highestVG == null || this.vgOrders[order].highestVG.altitude > highestVG.altitude) {
					highestVG = this.vgOrders[order].highestVG;
				}
			}
		}

		this.highestVG = highestVG;
		this.lowestVG = lowestVG;
	}
}

/* Functions for HTML */

function onLoad() {
	map = new Map(MAP_CENTRE, 12);
	map.addCircle(MAP_CENTRE, 100, "FCT/UNL");
	updateStatistics();
}

function updateVisibleLayerGroups(order) {
	map.toggleLayerGroupVisiblity(order);
	updateStatistics();
}

function updateStatistics() {
	// total visible Markers
	document.getElementById('total_visible').innerHTML = map.numVisibleMarkers;
	
	// partial total, for each Marker Order
	for (let order in VG_ORDERS)  {
		if (map.vgOrders[order].visible) {
			document.getElementById(VG_ORDERS[order] + '_visible').innerHTML = map.vgOrders[order].vgs.length;
		}
		else {
			document.getElementById(VG_ORDERS[order] + '_visible').innerHTML = 0;
		}
	}

	// lowest and highest marker
	document.getElementById('highest_visible').innerHTML = map.highestVG.name;
	document.getElementById('lowest_visible').innerHTML = map.lowestVG.name;
}
