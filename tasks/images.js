#!/usr/bin/env node

"use strict";

var async = require("async");
var child_process = require("child_process");
var fs = require("fs");
var path = require("path");
var request = require("request");

var inspectors = require("../config/inspectors.json");

var urls = {
    abilityone: "http://www.abilityone.gov/images/commission_logo.png",
    agriculture: "https://upload.wikimedia.org/wikipedia/commons/0/0e/USDA_logo.svg",
    airforce: "https://upload.wikimedia.org/wikipedia/commons/6/69/USAF_logo.png",
    amtrak: "https://pbs.twimg.com/profile_images/460870025516048384/qb-Dz6jD.jpeg",
    architect: "https://upload.wikimedia.org/wikipedia/commons/a/a5/US-ArchitectOfTheCapitol-2010Logo.svg",
    archives: "https://upload.wikimedia.org/wikipedia/commons/f/f4/NARA_Logo_created_2010.svg",
    army: "https://upload.wikimedia.org/wikipedia/commons/1/19/Emblem_of_the_United_States_Department_of_the_Army.svg",
    ccr: "http://www.usccr.gov/images/seal_usccr.png",
    cftc: "https://upload.wikimedia.org/wikipedia/commons/a/a9/US-CFTC-Seal.svg",
    cia: "https://upload.wikimedia.org/wikipedia/commons/2/23/CIA.svg",
    cncs: "https://upload.wikimedia.org/wikipedia/en/4/41/Cncs-logo_1.jpg",
    commerce: "https://upload.wikimedia.org/wikipedia/commons/f/f2/US-DeptOfCommerce-Seal.svg",
    cpb: "https://upload.wikimedia.org/wikipedia/commons/d/d6/Corporation_for_Public_Broadcasting_logo.svg",
    denali: "https://pbs.twimg.com/profile_images/2487040863/DC_Logo_For_Outside_Usel.jpg",
    dhs: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Seal_of_the_United_States_Department_of_Homeland_Security.svg",
    dia: "https://upload.wikimedia.org/wikipedia/commons/9/9d/US_Defense_Intelligence_Agency_%28DIA%29_seal.png",
    dod: "https://upload.wikimedia.org/wikipedia/commons/e/e0/United_States_Department_of_Defense_Seal.svg",
    doj: "https://upload.wikimedia.org/wikipedia/commons/5/54/Seal_of_the_United_States_Department_of_Justice.svg",
    dot: "https://upload.wikimedia.org/wikipedia/commons/3/3c/US-DeptOfTransportation-Seal.svg",
    eac: "https://upload.wikimedia.org/wikipedia/commons/3/3a/US-ElectionAssistanceCommission-Seal.svg",
    education: "https://pbs.twimg.com/profile_images/615220699108638720/Z3hown48.png",
    eeoc: "https://upload.wikimedia.org/wikipedia/commons/b/b7/US-EEOC-Seal.svg",
    energy: "https://upload.wikimedia.org/wikipedia/commons/b/bf/US-DeptOfEnergy-Seal.svg",
    epa: "https://upload.wikimedia.org/wikipedia/commons/1/14/Environmental_Protection_Agency_logo.svg",
    exim: "http://www.exim.gov/sites/all/themes/custom/exim/logo_new.png",
    fca: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Farm_Credit_Administration_Seal_%28USA%29.png",
    fcc: "https://upload.wikimedia.org/wikipedia/commons/c/c9/FCC_New_Logo.svg",
    fdic: "https://upload.wikimedia.org/wikipedia/commons/e/e6/US-FDIC-Logo.svg",
    fec: "https://upload.wikimedia.org/wikipedia/commons/c/c7/US-FederalElectionCommission.svg",
    fed: "https://upload.wikimedia.org/wikipedia/commons/e/e8/US-FederalReserveSystem-Seal.svg",
    fhfa: "https://upload.wikimedia.org/wikipedia/commons/f/fe/US-FederalHousingFinanceAgency-Seal.svg",
    flra: "https://upload.wikimedia.org/wikipedia/commons/1/13/US-FLRA-Seal.svg",
    fmc: "https://upload.wikimedia.org/wikipedia/commons/a/a0/FederalMaritimeCommissionSeal.jpg",
    ftc: "https://upload.wikimedia.org/wikipedia/commons/4/43/US-FederalTradeCommission-Seal.svg",
    gao: "https://upload.wikimedia.org/wikipedia/commons/3/37/US-GovernmentAccountabilityOffice-Logo.svg",
    gaoreports: "https://upload.wikimedia.org/wikipedia/commons/3/37/US-GovernmentAccountabilityOffice-Logo.svg",
    gpo: "https://upload.wikimedia.org/wikipedia/commons/6/6a/US-GovernmentPrintingOffice-Logo.svg",
    gsa: "https://upload.wikimedia.org/wikipedia/commons/8/89/US-GeneralServicesAdministration-Logo.svg",
    house: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Seal_of_the_United_States_House_of_Representatives.svg",
    hhs: "https://upload.wikimedia.org/wikipedia/commons/1/15/US-DeptOfHHS-Logo.svg",
    hud: "https://upload.wikimedia.org/wikipedia/commons/1/1c/US-DeptOfHUD-Seal.svg",
    interior: "https://upload.wikimedia.org/wikipedia/commons/e/e7/US-DeptOfTheInterior-Seal.svg",
    itc: "http://www.usitc.gov/sites/all/themes/usitc/top_header.png",
    labor: "https://upload.wikimedia.org/wikipedia/commons/d/da/DOL_Seal_with_Hammer.png",
    loc: "https://upload.wikimedia.org/wikipedia/commons/8/80/US-LibraryOfCongress-BookLogo.svg",
    lsc: "https://upload.wikimedia.org/wikipedia/en/2/2a/Legalservicescorp.jpg",
    marines: "https://upload.wikimedia.org/wikipedia/commons/2/21/USMC_logo.svg",
    nasa: "https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg",
    navy: "https://upload.wikimedia.org/wikipedia/commons/0/09/Seal_of_the_United_States_Department_of_the_Navy.svg",
    ncua: "https://upload.wikimedia.org/wikipedia/commons/b/b8/US-NationalCreditUnionAdmin-Seal.svg",
    nea: "https://upload.wikimedia.org/wikipedia/commons/e/ed/NEA_logo.jpg",
    neh: "http://www.neh.gov/files/neh_logo_stckd.jpg",
    nga: "https://upload.wikimedia.org/wikipedia/commons/9/9f/US-NationalGeospatialIntelligenceAgency-2008Seal.svg",
    nlrb: "https://upload.wikimedia.org/wikipedia/commons/b/be/National_Labor_Relations_Board_logo_-_color.jpg",
    nrc: "https://upload.wikimedia.org/wikipedia/commons/b/b4/US-NuclearRegulatoryCommission-Logo.svg",
    nro: "https://upload.wikimedia.org/wikipedia/commons/5/5f/NRO.svg",
    nsa: "https://upload.wikimedia.org/wikipedia/commons/0/04/National_Security_Agency.svg",
    nsf: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Nsf1.jpg",
    opm: "https://upload.wikimedia.org/wikipedia/commons/9/91/US-OfficeOfPersonnelManagement-Seal.svg",
    panama: "https://upload.wikimedia.org/wikipedia/commons/7/7d/US-PanamaCanalCommission-Seal-EO12304.jpg",
    pbgc: "https://upload.wikimedia.org/wikipedia/commons/f/fb/US-PensionBenefitGuarantyCorp-Logo.svg",
    peacecorps: "https://upload.wikimedia.org/wikipedia/commons/f/f6/US-Official-PeaceCorps-Logo.svg",
    prc: "https://upload.wikimedia.org/wikipedia/commons/8/81/U.S._Postal_Regulatory_Commission_Seal.jpg",
    rrb: "https://secure.rrb.gov/images/rrbsealtrans.gif",
    sba: "https://upload.wikimedia.org/wikipedia/commons/7/7f/US-SmallBusinessAdmin-Logo.svg",
    sec: "https://upload.wikimedia.org/wikipedia/commons/d/d4/US-SecuritiesAndExchangeCommission-Seal.svg",
    sigar: "https://www.sigar.mil/images/Sigar-Seal-new.png",
    smithsonian: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Smithsonian_logo_color.svg",
    ssa: "https://upload.wikimedia.org/wikipedia/commons/2/26/US-SocialSecurityAdmin-Seal.svg",
    state: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Seal_of_the_United_States_Department_of_State.svg",
    tigta: "https://upload.wikimedia.org/wikipedia/commons/3/3a/US-TreasuryInspectorGeneralForTaxAdmin-Seal.svg",
    treasury: "https://upload.wikimedia.org/wikipedia/commons/a/ac/US-TreasuryInspectorGeneral-Seal.svg",
    tva: "https://upload.wikimedia.org/wikipedia/commons/f/f4/US-TennesseeValleyAuthority-Logo.svg",
    usaid: "https://upload.wikimedia.org/wikipedia/commons/1/17/USAID-Identity.svg",
    uscp: "https://pbs.twimg.com/profile_images/95405530/uscp_patch.JPG",
    usps: "https://pbs.twimg.com/profile_images/460880152520454144/90ieWtNy.png",
    va: "https://upload.wikimedia.org/wikipedia/commons/0/05/Seal_of_the_U.S._Department_of_Veterans_Affairs.svg",
    osc: "https://upload.wikimedia.org/wikipedia/en/c/c1/Wiki_OSC_Seal.jpg"
};

var root = path.resolve(__dirname, "..");
var output_dir = path.resolve(root, "public", "images", "inspectors");
var originals_dir = path.resolve(root, "tasks/images-original");

function find_original(slug) {
  if (fs.existsSync(path.resolve(originals_dir, slug + "-original.svg"))) {
    return slug + "-original.svg";
  } else if (fs.existsSync(path.resolve(originals_dir, slug + "-original.png"))) {
    return slug + "-original.png";
  } else if (fs.existsSync(path.resolve(originals_dir, slug + "-original.gif"))) {
    return slug + "-original.gif";
  } else if (fs.existsSync(path.resolve(originals_dir, slug + "-original.jpg"))) {
    return slug + "-original.jpg";
  } else {
    return null;
  }
}

function convert_file(slug, original, done) {
  var command, args;
  if (original.endsWith(".svg")) {
    command = "svgexport";
    args = [
      path.resolve(originals_dir, original),
      path.resolve(output_dir, slug + ".png"),
      "png",
      "100:100",
      "pad"
    ];
  } else {
    command = "convert";
    args = [
      path.resolve(originals_dir, original),
      "-resize",
      "100x100",
      "-background",
      "none",
      "-gravity",
      "center",
      "-extent",
      "100x100",
      path.resolve(output_dir, slug + ".png")
    ];
  }
  console.log(slug + ": running " + command);
  var child = child_process.spawn(command, args);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.on("close", function(code) {
    if (code === 0) {
      console.log(slug + ": " + command + " finished");
      done();
    } else {
      console.log(slug + ": " + command + " failed");
      done(new Error(command + " returned an exit code of " + code));
    }
  });
}

async.eachSeries(inspectors, function(inspector, done) {
  var slug = inspector.slug;
  if (fs.existsSync(path.resolve(output_dir, slug + ".png"))) {
    done();
    return;
  }
  var original = find_original(slug);
  if (!original) {
    if (slug in urls) {
      console.log(slug + ": downloading image from " + urls[slug]);
      var extension = path.extname(urls[slug]).toLowerCase();
      if (extension == ".jpeg") {
        extension = ".jpg";
      }
      original = slug + "-original" + extension;
      var file = fs.createWriteStream(path.resolve(originals_dir, original));
      var r = request({
        url: urls[slug],
        headers: {
          'User-Agent': 'https://oversight.garden (https://github.com/konklone/oversight.garden)'
        }
      });
      r.pipe(file);
      r.on("error", function(e) {
        fs.unlink(file);
        done(e);
      });
      file.on("finish", function() {
        file.close(function() {
          convert_file(slug, original, done);
        });
      });
    } else {
      console.log(slug + ": image missing");
      done();
    }
  } else {
    convert_file(slug, original, done);
  }
}, function(e) {
  if (e) {
    console.log("Error: " + e);
  } else {
    console.log("Done updating images");
  }
});
