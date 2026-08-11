/*!
 * dragon-embed.js — the whole dragon in one file. Drop it into any project.
 *
 *   <div data-dragon style="width:420px;height:260px"></div>
 *   <script src="dragon-embed.js"></script>
 *
 * or, if you want a handle on it:
 *
 *   var d = Dragon.mount('#hero', { follow: true, entrance: 2000 });
 *   d.play(); d.rewind(); d.pose(500); d.destroy();
 *
 * No dependencies, no network, no build step, nothing to license. The artwork
 * and the keyframes are baked in below; the ~120 lines that move them are the
 * only runtime involved.
 *
 * Everything lives inside this closure — the single global is `Dragon`. Parts
 * are found through a data attribute rather than element ids, so two dragons
 * on one page cannot collide, and neither can this and your own markup.
 *
 * OPTIONS (all optional)
 *   size      '100%'    CSS width for the dragon inside its container
 *   dragon    '#1a2740' her colour
 *   edge      '#0b1220' her outline
 *   accent    '#05f'    her eye
 *   entrance  5000      ms she holds on the first frame before playing
 *   loop      false     restart after finishing instead of holding the end
 *   follow    false     chase the pointer around the container
 *   timeline  'free'    'free' plays it; 'speed' lets airspeed scrub it
 *                       ('speed' needs follow:true, or it falls back)
 *   crop      true      tighten the frame to her, so she fills the container
 *   autoplay  true      false leaves her on frame 0 until you call play()
 *   reduced   true      honour prefers-reduced-motion by showing the end pose
 *
 * data-* attributes work too: data-dragon-follow="true", data-dragon-size="300px".
 *
 * The entrance re-arms whenever she becomes yours again: tabbing back, alt-
 * tabbing from an editor, or scrolling her into view. She rewinds each time,
 * so it is always watched from the top.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else if (typeof define === 'function' && define.amd) define(factory);
  else root.Dragon = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SVG  = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 529 268\" shape-rendering=\"geometricPrecision\" text-rendering=\"geometricPrecision\"><g class=\"dgn-art\"><path data-k=\"4\" d=\"M358.5,170.874l-12,2.5-10.593-11.224L317,152.198l8.569-10.814l20.931,13.99l12,15.5Z\" fill=\"#d9d9d9\" stroke=\"#25dc34\"/><path data-k=\"5\" d=\"M333.5,153.289l5-5.999l14-10.501l7.5-6.999-4-5.501-6-4.5-6-5-9.662155-.475253-8.120155,3.094191L319,147.29l4,4l4,3l8,3.5-1.5-4.501Z\" fill=\"#d9d9d9\" stroke=\"rgba(22,255,216,0)\" stroke-width=\"3\"/><path data-k=\"6\" d=\"M260.42,170.79h-15.42c0,0,4.406-23,4.406-23s-4.406-23-4.406-23h15.42l3.58,23-3.58,23Z\" transform=\"translate(-14.124417 0.756665)\" fill=\"#d9d9d9\" stroke=\"#25dc34\"/><path data-k=\"7\" d=\"M317.86077,150.24931L326,144.79v-6-6.5l1.5-6.5l2-4.5v-3l-7.139381-2.968089-8.356862-2.142785-13.713825-2.571342-16.070889-2.999899L264.5,106.29l-18,2-14.5,3-18.5,5-14,5-14.5,8v4.71l.5,10.79-.47039,11.228796L209.5,159.29l20.07802,4.0303l29.998993,3.642735L281.5,165.79l10.5-3.5l8.5-2.5l6.004009-2.683777L311.5,154.29l6.36077-4.04069Z\" fill=\"#d9d9d9\" stroke=\"#1536ef\"/><path data-k=\"8\" d=\"M238.42,170.79h-15.42l4.406-23-4.406-23h15.42l3.58,23-3.58,23Z\" transform=\"translate(-3.531104 0.756665)\" fill=\"#d9d9d9\" stroke=\"#25dc34\"/><path data-k=\"9\" d=\"M164.977191,145.272053Q174.5,134.29,174.5,134.29c0,0,11-5,11-5v5v3v5v5v4.5c0,0,3,2,3,2s7.5,1,7.5,1l7,2.5l9,2l10,2.5l13.5,3c0,0,18.423,1.932,18.423,1.932l18.5-.157l12.999-.11l23.987-1.704-18.957,5.161-15.974,3.136-11.491,1.097c0,0-19.627549,3.920928-19.627549,3.920928s-15.569172,2.041038-15.569172,2.041038-13.990871-1.209471-20.139308-1.680346c-3.750997-.287268-12.804556-.721383-12.804556-.721383s-12.443865-3.967609-12.443865-3.967609l-10.820751-3.787263c0,0-7.213835-5.049684-7.213835-5.049684s-3.246225-5.590722-3.246225-5.590722L161,153.79Z\" transform=\"translate(16.56139 -8.077286)\" fill=\"#d9d9d9\" stroke=\"#000\"/><path data-k=\"10\" d=\"M274.887514,117.833961l-16.117322,14.801623-7.236349,11.512374-7.894199,3.947099L233.932,149.79l-17.818,4.244-31.495,9.502-28.33,9.023-14.357,6.231-11.5,7L93,208.929l35.38-53.541l31.885-23.747c0,0,25.934-15.08,25.934-15.08l36.62-12.619l43.613-3.152l30.5,3.152l8,2.848l4.5,4.5l5,8.5-12.572639-7.218838c0,0-13.485924.328925-13.485924.328925l-13.485923,4.933874Z\" fill=\"#d9d9d9\" stroke=\"#000\"/><path data-k=\"11\" d=\"M339.225,160.966l-9.894-8.136-7.029-14.434L321,126.586l2.864-6.824l6.509-7.348l8.852-2.624l9.112,3.674l7.03,6.298l4.686,6.299l3.385,9.973L365,146.532v10.235l-3.645,6.823-5.467,4.2-9.113-1.05-7.55-5.774Z\" fill=\"#d9d9d9\" stroke=\"#740aff\" stroke-width=\"3\"/><path data-k=\"12\" d=\"M329.576,101.516l-.296-4.9098.222-3.4684l1.445-2.8135l3.348,2.2661l2.644,3.0529l1.404,3.0178l1.287,2.7659l1.922,4.46l1.436,4.074-15.323,6.517-1.772-3.153-.951-3.687-.667-2.749.204-2.848l2.378,1.494l1.997,1.965l1.852,2.362l2.325,3.354-1.869-6.319-1.586-5.381Z\" fill=\"#d9d9d9\" stroke=\"#ffa200\"/><ellipse data-k=\"13\" rx=\"0.932144\" ry=\"3.489566\" transform=\"matrix(0.838703 -0.112012 0.126938 0.950465 354.958154 144.004575)\" fill=\"#05f\" stroke-width=\"0\"/><path data-k=\"14\" d=\"M355.5,145.79c0,0,0-2,0-2v-1c0,0-.5-2-.5-2s-.316-1.438-.316-1.438l-.495-1.318c0,0-.496-1.317-.496-1.317s-.525-.999-.525-.999-1.231582-2.689849-1.231582-2.689849-1.807109-2.614163-1.807109-2.614163.462486,2.440181.462486,2.440181.563477,1.385214.563477,1.385214.737288,1.511909.737288,1.511909.554014,1.047216.554014,1.047216l.563477,1.291302.539999,1.408693.305217,1.033041q.187825,1.05061.187825,1.150432c0,.099822.234783,1.126955.234783,1.126955q0,0,.023478,1.361736l.117391,2.512169c0,0,.102471,1.779166.102471,1.779166s.978785-2.672002.978785-2.672002Z\" fill=\"none\" stroke=\"#000\"/><path data-k=\"15\" d=\"M352,170.31l-15.366,7.999-21.727-7.363L294,150.274l15.249-7.337l20.201,20.438L352,170.31Z\" fill=\"#d9d9d9\" stroke=\"#25dc34\"/></g>\n";
  var KF   = {"4":{"d":[{"t":0,"v":["M",358.5,170.874,"L",346.5,173.374,"L",335.907,162.15,"L",317,152.198,"L",325.569,141.384,"L",346.5,155.374,"L",358.5,170.874,"Z"]},{"t":1000,"v":["M",329.536,157.797,"L",311.629,164.859,"L",311.629,150.482,"L",311.629,129.548,"L",322.474,116.937,"L",326.257,141.402,"L",329.536,157.797,"Z"]}]},"5":{"d":[{"t":0,"v":["M",333.5,153.289,"L",338.5,147.29,"L",352.5,136.789,"L",360,129.79,"L",356,124.289,"L",350,119.789,"L",344,114.789,"L",334.338,114.314,"L",326.218,117.408,"L",319,147.29,"L",323,151.29,"L",327,154.29,"L",335,157.79,"L",333.5,153.289,"Z"]},{"t":1000,"v":["M",328.699,90.84,"L",333.312,83.291,"L",340.559,72.364,"L",349.87,59.854,"L",333.436,51.707,"L",318.408,50.443,"L",311.104,60.978,"L",309.396,68.268,"L",307.309,81.823,"L",312.761,92.727,"L",318.633,98.599,"L",323.876,115.584,"L",325.973,102.164,"L",328.699,90.84,"Z"]}]},"6":{"d":[{"t":0,"v":["M",260.42,170.79,"L",245,170.79,"C",245,170.79,249.406,147.79,249.406,147.79,"C",249.406,147.79,245,124.79,245,124.79,"L",260.42,124.79,"L",264,147.79,"L",260.42,170.79,"Z"]},{"t":1000,"v":["M",260.42,170.79,"L",245,170.79,"C",245,170.79,245.294,155.238,245.294,148.212,"C",245.294,141.187,245.799,133.079,245.799,133.079,"L",260.68,130.052,"L",260.175,147.96,"L",260.42,170.79,"Z"]}]},"7":{"d":[{"t":0,"v":["M",317.861,150.249,"L",326,144.79,"L",326,138.79,"L",326,132.29,"L",327.5,125.79,"L",329.5,121.29,"L",329.5,118.29,"L",322.361,115.322,"L",314.004,113.179,"L",300.29,110.608,"L",284.219,107.608,"L",264.5,106.29,"L",246.5,108.29,"L",232,111.29,"L",213.5,116.29,"L",199.5,121.29,"L",185,129.29,"L",185,134,"L",185.5,144.79,"L",185.03,156.019,"L",209.5,159.29,"L",229.578,163.32,"L",259.577,166.963,"L",281.5,165.79,"L",292,162.29,"L",300.5,159.79,"L",306.504,157.106,"L",311.5,154.29,"L",317.861,150.249,"Z"]},{"t":1000,"v":["M",317.167,125.896,"L",318.802,125.319,"L",320.927,124.159,"L",322.055,121.34,"L",323.747,117.956,"L",324.311,110.626,"L",321.491,101.603,"L",318.108,89.762,"L",311.341,81.303,"L",299.499,83.559,"L",281.173,86.378,"L",262.565,90.889,"L",244.802,95.401,"L",225.912,102.449,"L",225.601,102.365,"L",212.632,110.823,"L",199.977,119.762,"L",199.915,126.867,"L",200.415,137.657,"L",200.226,155.088,"L",219.68,153.961,"L",226.194,157.71,"L",249.877,152.072,"L",270.741,143.895,"L",291.887,137.128,"L",305.702,132.617,"L",313.033,128.388,"L",314.859,127.242,"L",317.167,125.896,"Z"]}]},"8":{"d":[{"t":0,"v":["M",238.42,170.79,"L",223,170.79,"L",227.406,147.79,"L",223,124.79,"L",238.42,124.79,"L",242,147.79,"L",238.42,170.79,"Z"]},{"t":1000,"v":["M",238.42,170.79,"L",223.099,170.66,"L",223.351,149.221,"L",223.099,132.827,"L",238.989,131.313,"L",238.484,147.96,"L",238.42,170.79,"Z"]}]},"9":{"d":[{"t":0,"v":["M",164.977,145.272,"Q",174.5,134.29,174.5,134.29,"C",174.5,134.29,185.5,129.29,185.5,129.29,"L",185.5,134.29,"L",185.5,137.29,"L",185.5,142.29,"L",185.5,147.29,"L",185.5,151.79,"C",185.5,151.79,188.5,153.79,188.5,153.79,"C",188.5,153.79,196,154.79,196,154.79,"L",203,157.29,"L",212,159.29,"L",222,161.79,"L",235.5,164.79,"C",235.5,164.79,253.923,166.722,253.923,166.722,"L",272.423,166.565,"L",285.422,166.455,"L",309.409,164.751,"L",290.452,169.912,"L",274.478,173.048,"L",262.987,174.145,"C",262.987,174.145,243.359,178.066,243.359,178.066,"C",243.359,178.066,227.79,180.107,227.79,180.107,"C",227.79,180.107,213.799,178.897,207.651,178.427,"C",203.9,178.139,194.846,177.705,194.846,177.705,"C",194.846,177.705,182.403,173.738,182.403,173.738,"L",171.582,169.95,"C",171.582,169.95,164.368,164.901,164.368,164.901,"C",164.368,164.901,161.122,159.31,161.122,159.31,"L",161,153.79,"Z"]},{"t":1000,"v":["M",169.773,139.962,"Q",178.62,132.425,178.62,132.425,"C",178.62,132.425,185.189,127.033,185.189,127.033,"L",185.5,134.29,"L",185.5,137.29,"L",185.5,142.29,"L",185.5,147.29,"L",185.526,162.154,"C",185.526,162.154,173.763,165.789,173.763,165.789,"C",173.763,165.789,160.042,170.017,160.042,170.017,"L",147.058,173.588,"L",130.829,176.184,"L",114.275,174.886,"L",98.98,171.484,"C",98.98,171.484,79.6,167.25,79.6,167.25,"L",64.292,161.387,"L",50.45,149.988,"L",35.107,129.139,"L",55.498,142.822,"L",70.78,150.542,"L",84.905,155.69,"C",84.905,155.69,100.142,160.114,100.142,160.114,"C",100.142,160.114,112.594,161.916,112.594,161.916,"C",112.594,161.916,124.062,162.899,124.062,162.899,"C",124.062,162.899,134.056,161.916,134.056,161.916,"C",134.056,161.916,144.542,160.114,144.542,160.114,"L",151.095,156.509,"C",151.095,156.509,156.01,152.413,156.01,152.413,"C",156.01,152.413,162.728,146.679,162.728,146.679,"L",169.773,139.962,"Z"]}]},"10":{"d":[{"t":0,"v":["M",274.888,117.834,"L",258.77,132.636,"L",251.534,144.148,"L",243.64,148.095,"L",233.932,149.79,"L",216.114,154.034,"L",184.619,163.536,"L",156.289,172.559,"L",141.932,178.79,"L",130.432,185.79,"L",93,208.929,"L",128.38,155.388,"L",160.265,131.641,"C",160.265,131.641,186.199,116.561,186.199,116.561,"L",222.819,103.942,"L",266.432,100.79,"L",296.932,103.942,"L",304.932,106.79,"L",309.432,111.29,"L",314.432,119.79,"L",301.859,112.571,"C",301.859,112.571,288.373,112.9,288.373,112.9,"L",274.888,117.834,"Z"]},{"t":1000,"v":["M",294.384,129.682,"L",276.397,150.656,"L",266.361,163.4,"L",266.438,141.455,"L",251.296,130.713,"L",235.593,126.34,"L",216.674,129.047,"L",193.895,135.616,"L",169.316,150.808,"L",146.281,167.158,"L",123.376,185.053,"L",138.937,129.964,"L",169.949,102.544,"C",169.949,102.544,206.497,84.904,206.497,84.904,"L",239.702,79.234,"L",261.968,83.219,"L",278.636,89.38,"L",298.35,100.114,"L",307.619,108.349,"L",314.432,119.79,"L",307.474,119.823,"C",307.474,119.823,302.621,124.09,302.621,124.09,"L",294.384,129.682,"Z"]}],"transform":{"data":{"t":{"x":-203.716,"y":-154.86}},"keys":{"o":[{"t":0,"v":{"x":203.716,"y":154.86,"type":"corner"}},{"t":1000,"v":{"x":167.076,"y":75.775,"type":"corner"}}],"r":[{"t":0,"v":0},{"t":1000,"v":26.577}]}}},"11":{"transform":{"data":{"t":{"x":-343,"y":-138.79}},"keys":{"o":[{"t":0,"v":{"x":343,"y":138.79,"type":"corner"}},{"t":1000,"v":{"x":334.028,"y":58.652,"type":"corner"}}],"r":[{"t":0,"v":0},{"t":1000,"v":-4.444}]}}},"12":{"transform":{"data":{"t":{"x":-333.632,"y":-103.401}},"keys":{"o":[{"t":0,"v":{"x":333.632,"y":103.401,"type":"corner"}},{"t":1000,"v":{"x":318.983,"y":24.752,"type":"corner"}}],"r":[{"t":0,"v":0},{"t":1000,"v":-10.261}]}}},"13":{"transform":{"data":{"r":-7.607},"keys":{"o":[{"t":0,"v":{"x":354.958,"y":144.005,"type":"corner"}},{"t":100,"v":{"x":353.572,"y":134.922,"type":"corner"}},{"t":200,"v":{"x":352.329,"y":126.27,"type":"corner"}},{"t":300,"v":{"x":351.421,"y":118.0,"type":"corner"}},{"t":400,"v":{"x":350.035,"y":110.017,"type":"corner"}},{"t":500,"v":{"x":348.839,"y":101.269,"type":"corner"}},{"t":600,"v":{"x":348.31,"y":93.017,"type":"corner"}},{"t":700,"v":{"x":347.846,"y":83.774,"type":"corner"}},{"t":800,"v":{"x":347.549,"y":75.839,"type":"corner"}},{"t":900,"v":{"x":347.023,"y":66.804,"type":"corner"}},{"t":1000,"v":{"x":346.092,"y":57.367,"type":"corner"}}],"s":[{"t":0,"v":{"x":0.846,"y":0.959}},{"t":100,"v":{"x":1.009,"y":0.959}},{"t":200,"v":{"x":1.277,"y":1.154}},{"t":400,"v":{"x":1.691,"y":1.154}},{"t":500,"v":{"x":1.878,"y":1.247}},{"t":600,"v":{"x":2.732,"y":1.247}},{"t":700,"v":{"x":2.732,"y":1.567}},{"t":1000,"v":{"x":4.189,"y":1.976}}]}}},"14":{"d":[{"t":0,"v":["M",355.5,145.79,"C",355.5,145.79,355.5,143.79,355.5,143.79,"L",355.5,142.79,"C",355.5,142.79,355,140.79,355,140.79,"C",355,140.79,354.684,139.352,354.684,139.352,"L",354.189,138.034,"C",354.189,138.034,353.693,136.717,353.693,136.717,"C",353.693,136.717,353.168,135.718,353.168,135.718,"C",353.168,135.718,351.936,133.028,351.936,133.028,"C",351.936,133.028,350.129,130.414,350.129,130.414,"C",350.129,130.414,350.592,132.854,350.592,132.854,"C",350.592,132.854,351.155,134.239,351.155,134.239,"C",351.155,134.239,351.893,135.751,351.893,135.751,"C",351.893,135.751,352.447,136.799,352.447,136.799,"L",353.01,138.09,"L",353.55,139.499,"L",353.855,140.532,"Q",354.043,141.582,354.043,141.682,"C",354.043,141.782,354.278,142.809,354.278,142.809,"Q",354.278,142.809,354.301,144.171,"L",354.419,146.683,"C",354.419,146.683,354.521,148.462,354.521,148.462,"C",354.521,148.462,355.5,145.79,355.5,145.79,"Z"]},{"t":500,"v":["M",355.155,145.082,"C",355.33,144.9,355.503,143.352,355.503,143.352,"L",355.253,142.15,"C",355.253,142.15,355,140.79,355,140.79,"C",355,140.79,354.684,139.352,354.684,139.352,"L",354.189,138.034,"C",354.189,138.034,353.574,135.701,353.574,135.701,"C",353.574,135.701,352.781,133.965,352.781,133.965,"C",352.781,133.965,351.687,132.359,351.687,132.359,"C",351.687,132.359,350.129,130.414,350.129,130.414,"C",350.129,130.414,349.553,132.856,349.553,132.856,"C",349.553,132.856,349.353,135.092,349.353,135.092,"C",349.353,135.092,349.262,137.153,349.262,137.153,"C",349.262,137.153,349.314,139.181,349.314,139.181,"L",349.779,141.443,"L",350.192,143.087,"L",350.807,144.443,"Q",351.308,145.337,351.308,145.437,"C",351.308,145.537,351.855,146.24,351.855,146.24,"Q",351.855,146.24,352.628,147.5,"L",353.54,148.458,"C",353.54,148.458,354.795,147.146,354.795,147.146,"C",354.795,147.146,355.155,145.082,355.155,145.082,"Z"]},{"t":1000,"v":["M",362.859,149.408,"C",363.034,149.225,363.224,147.289,363.224,147.289,"L",363.303,145.189,"C",363.303,145.189,363.273,143.198,363.273,143.198,"C",363.273,143.198,362.896,140.811,362.896,140.811,"L",362.188,138.749,"C",362.188,138.749,361.613,136.78,361.613,136.78,"C",361.613,136.78,360.447,134.706,360.447,134.706,"C",360.447,134.706,359.37,132.594,359.37,132.594,"C",359.37,132.594,358.04,130.668,357.227,130.742,"C",357.227,130.742,355.646,133.852,355.646,133.852,"C",355.646,133.852,354.452,137.34,354.452,137.34,"C",354.452,137.34,354.361,139.07,354.348,139.812,"C",354.348,139.812,354.372,142.678,354.372,142.678,"L",354.796,144.759,"L",355.112,146.512,"L",355.869,147.829,"Q",356.473,149.024,356.473,149.124,"C",356.473,149.224,357.058,149.916,357.058,149.916,"Q",357.058,149.916,358.186,151.367,"L",360.193,152.169,"C",360.193,152.169,361.414,151.949,361.794,151.611,"C",361.794,151.611,362.859,149.408,362.859,149.408,"Z"]}],"transform":{"data":{"t":{"x":-353,"y":-138.29}},"keys":{"o":[{"t":0,"v":{"x":353,"y":138.29,"type":"corner"}},{"t":500,"v":{"x":348.118,"y":95.994,"type":"corner"}},{"t":1000,"v":{"x":338.693,"y":51.213,"type":"corner"}}],"r":[{"t":0,"v":0},{"t":1000,"v":-6.95}]}}},"15":{"d":[{"t":0,"v":["M",352,170.31,"L",336.634,178.309,"L",314.907,170.946,"L",294,150.274,"L",309.249,142.937,"L",329.45,163.375,"L",352,170.31,"Z"]},{"t":1000,"v":["M",321.387,171.495,"L",304.044,171.428,"L",304.044,152.511,"L",303.575,132.902,"L",321.578,123.028,"L",321.387,150.167,"L",321.387,171.495,"Z"]}]}};
  var SPAN = 1000;      // ms; her last keyframe
  var BBOX = {"x0":35,"y0":25,"x1":363,"y1":209};      // her bounds across the whole morph, in viewBox units

  var DEFAULTS = {
    size: '100%', dragon: '#1a2740', edge: '#0b1220', accent: '#05f',
    entrance: 5000, loop: false, follow: false, timeline: 'free',
    crop: true, autoplay: true, reduced: true,
    gap: 60, pull: 0.0016, drag: 0.9955, maxSpeed: 1.6,
    bank: 16, bob: 10, facing: 1, ease: 0.10
  };

  var CSS =
    '.dgn{position:relative}' +
    '.dgn-wrap{position:absolute;pointer-events:none;will-change:transform}' +
    '.dgn-wrap svg{display:block;width:100%;height:auto;overflow:visible}' +
    '.dgn-follow{cursor:none}' +
    '.dgn-orb{position:absolute;left:0;top:0;width:14px;height:14px;' +
      'margin:-7px 0 0 -7px;border-radius:50%;pointer-events:none;' +
      'will-change:transform;background:var(--dgn-dragon);' +
      'box-shadow:0 0 12px 4px rgba(47,111,208,.30),0 0 40px 14px rgba(90,130,255,.14)}' +
    /* The export still carries a different Figma stroke colour per part, from
       marking the layers up. Folding them into one edge is what makes her read
       as one creature instead of a diagram. A zero-alpha stroke is left out:
       it belongs to a part meant to have no outline. */
    '.dgn [stroke="#000"],.dgn [stroke="#1536ef"],.dgn [stroke="#25dc34"],.dgn [stroke="#740aff"],.dgn [stroke="#ffa200"]{stroke:var(--dgn-edge)}' +
    '.dgn [fill="#d9d9d9"]{fill:var(--dgn-dragon)}' +
    '.dgn [fill="#05f"]{fill:var(--dgn-accent)}';

  var styled = false;
  function injectCSS() {
    if (styled) return;
    styled = true;
    var s = document.createElement('style');
    s.setAttribute('data-dragon-css', '');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // =========================================================================
  //  THE TIMELINE
  //  poseAt(ms) is pure: no clock, no state. Whatever drives it — a countdown,
  //  an airspeed, a scrubber — is the caller's business.
  // =========================================================================

  // Which keyframe pair straddles ms, and how far between them we are.
  // Clamps at both ends, so pose(-1) and pose(1e9) are the end poses.
  function span(keys, ms) {
    var n = keys.length;
    if (ms <= keys[0].t)     return [keys[0], keys[0], 0];
    if (ms >= keys[n - 1].t) return [keys[n - 1], keys[n - 1], 0];
    var i = 1;
    while (keys[i].t < ms) i++;
    var a = keys[i - 1], b = keys[i];
    return [a, b, (ms - a.t) / (b.t - a.t)];
  }
  function mix(a, b, u) { return a + (b - a) * u; }

  // Every keyframe of a path shares one command sequence, so the slots line
  // up: letters pass through, numbers interpolate.
  function pathAt(keys, ms) {
    var s = span(keys, ms), A = s[0].v, B = s[1].v, u = s[2], out = [], i, v;
    for (i = 0; i < A.length; i++) {
      v = A[i];
      out.push(typeof v === 'string' ? v : (u ? mix(v, B[i], u) : v).toFixed(3));
    }
    return out.join(' ');
  }

  // matrix = translate(origin) . rotate . scale . translate(t)
  function matrixAt(tr, ms) {
    var k = tr.keys || {}, d = tr.data || {}, s;
    var ox = d.o ? d.o.x : 0, oy = d.o ? d.o.y : 0;
    var r = d.r || 0;
    var sx = d.s ? d.s.x : 1, sy = d.s ? d.s.y : 1;
    if (k.o) { s = span(k.o, ms); ox = mix(s[0].v.x, s[1].v.x, s[2]); oy = mix(s[0].v.y, s[1].v.y, s[2]); }
    if (k.r) { s = span(k.r, ms); r  = mix(s[0].v, s[1].v, s[2]); }
    if (k.s) { s = span(k.s, ms); sx = mix(s[0].v.x, s[1].v.x, s[2]); sy = mix(s[0].v.y, s[1].v.y, s[2]); }
    var tx = d.t ? d.t.x : 0, ty = d.t ? d.t.y : 0;
    var rad = r * Math.PI / 180, c = Math.cos(rad), n = Math.sin(rad);
    var a0 = c * sx, b0 = n * sx, c0 = -n * sy, d0 = c * sy;
    return 'matrix(' + [a0, b0, c0, d0,
      ox + a0 * tx + c0 * ty, oy + b0 * tx + d0 * ty]
      .map(function (v) { return +v.toFixed(6); }).join(' ') + ')';
  }

  // =========================================================================
  //  MOUNT
  // =========================================================================
  function mount(target, opts) {
    var host = typeof target === 'string' ? document.querySelector(target) : target;
    if (!host) { console.warn('[dragon] no element for', target); return null; }

    injectCSS();
    var o = {}, key;
    for (key in DEFAULTS) o[key] = DEFAULTS[key];
    for (key in (opts || {})) o[key] = opts[key];
    // data-dragon-* attributes, e.g. data-dragon-follow="true"
    for (key in DEFAULTS) {
      var attr = host.getAttribute('data-dragon-' + key.toLowerCase());
      if (attr === null) continue;
      o[key] = attr === 'true' ? true : attr === 'false' ? false
             : (attr !== '' && !isNaN(attr) ? +attr : attr);
    }

    // 'speed' reads the pose off her airspeed; without follow there is none.
    var mode = (o.timeline === 'speed' && !o.follow) ? 'free' : o.timeline;
    if (mode !== o.timeline) console.warn("[dragon] timeline:'speed' needs follow:true");

    var still = o.reduced && window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- DOM ----
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    host.classList.add('dgn');
    host.style.setProperty('--dgn-dragon', o.dragon);
    host.style.setProperty('--dgn-edge',   o.edge);
    host.style.setProperty('--dgn-accent', o.accent);
    if (o.follow && !still) host.classList.add('dgn-follow');

    var wrap = document.createElement('div');
    wrap.className = 'dgn-wrap';
    wrap.style.width = o.size;
    wrap.innerHTML = SVG;
    host.appendChild(wrap);

    var svg = wrap.querySelector('svg');
    var orb = null;
    if (o.follow && !still) {
      orb = document.createElement('div');
      orb.className = 'dgn-orb';
      host.appendChild(orb);
    }

    // ---- parts ----
    var NODE = [], list = svg.querySelectorAll('[data-k]'), i;
    for (i = 0; i < list.length; i++) {
      var k = list[i].getAttribute('data-k');
      if (KF[k]) NODE.push([list[i], KF[k]]);
    }
    function poseAt(ms) {
      for (var j = 0; j < NODE.length; j++) {
        var el = NODE[j][0], p = NODE[j][1];
        if (p.d) el.setAttribute('d', pathAt(p.d, ms));
        if (p.transform) el.setAttribute('transform', matrixAt(p.transform, ms));
      }
    }

    // ---- framing ----
    // Cropping tightens the viewBox onto her, so `size` means her size rather
    // than the size of the frame she was exported in. The centring maths below
    // reads whatever viewBox is actually there, so either way works.
    if (o.crop) {
      var m = 12;
      svg.setAttribute('viewBox', (BBOX.x0 - m) + ' ' + (BBOX.y0 - m) + ' ' +
        (BBOX.x1 - BBOX.x0 + 2 * m) + ' ' + (BBOX.y1 - BBOX.y0 + 2 * m));
    }
    var centre = (function () {
      var vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
      if (vb.length !== 4 || !vb[2] || !vb[3]) return { x: 0, y: 0 };
      var bx = (BBOX.x0 + BBOX.x1) / 2, by = (BBOX.y0 + BBOX.y1) / 2;
      return { x: (vb[0] + vb[2] / 2 - bx) / vb[2] * 100,
               y: (vb[1] + vb[3] / 2 - by) / vb[3] * 100 };
    })();

    if (!o.follow || still) {
      // Centred in the CONTAINER, not the viewport: left/top put the wrap's
      // corner at the middle, the percentage transform pulls her middle onto
      // it. Percentages resolve against the wrap, so this survives resizing
      // without a listener.
      wrap.style.left = '50%';
      wrap.style.top = '50%';
      wrap.style.transform = 'translate(' + (centre.x - 50) + '%,' + (centre.y - 50) + '%)';
    } else {
      wrap.style.left = '0';
      wrap.style.top = '0';
    }

    // ---- state ----
    var phase = 'hold';     // 'hold' -> 'play' -> 'done'
    var phaseAt = null;     // rAF stamp this phase began; null = stamp it next frame
    var pose = 0;
    var raf = null, last = 0, dead = false;
    var here = false, seen = !('IntersectionObserver' in window);

    poseAt(still ? SPAN : 0);
    if (still) return handle();          // reduced motion: end pose, no loop

    // ---- flight ----
    var mouse = { x: 0, y: 0 }, lastMove = 0, awake = false;
    var d = { x: 0, y: 0, vx: 0, vy: 0, facing: 1, flip: 1, bank: 0 };
    function onMove(e) {
      var r = host.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      mouse.x = t.clientX - r.left; mouse.y = t.clientY - r.top;
      lastMove = performance.now(); awake = true;
    }
    if (o.follow) {
      var r0 = host.getBoundingClientRect();
      d.x = mouse.x = r0.width / 2; d.y = mouse.y = r0.height / 2;
      host.addEventListener('mousemove', onMove);
      host.addEventListener('touchmove', onMove, { passive: true });
    }

    function fly(now, dt) {
      var dx = mouse.x - d.x, dy = mouse.y - d.y;
      var dist = Math.hypot(dx, dy) || 1;
      // She chases a point `gap` short of the cursor; past it the error goes
      // negative and the same spring pushes her back out, so she trails it.
      var pull = Math.max(-o.gap, Math.min(600, dist - o.gap)) * o.pull;
      d.vx += (dx / dist) * pull * dt;
      d.vy += (dy / dist) * pull * dt;
      var k = Math.pow(o.drag, dt);
      d.vx *= k; d.vy *= k;
      var sp = Math.hypot(d.vx, d.vy);
      if (sp > o.maxSpeed) { d.vx = d.vx / sp * o.maxSpeed; d.vy = d.vy / sp * o.maxSpeed; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      dx = mouse.x - d.x; dy = mouse.y - d.y;
      dist = Math.hypot(dx, dy);
      if (dist < o.gap) {                       // the spring can overshoot a fast flick
        var q = dist || 1;
        d.x = mouse.x - (dx / q) * o.gap;
        d.y = mouse.y - (dy / q) * o.gap;
      }
      if (Math.abs(d.vx) > 0.06) d.facing = (d.vx > 0 ? 1 : -1) * o.facing;
      d.flip += (d.facing - d.flip) * 0.10 * dt / 16;
      var wantBank = Math.max(-1, Math.min(1, d.vy * 1.2)) * o.bank;
      d.bank += (wantBank - d.bank) * 0.06 * dt / 16;
      var bob = Math.sin(now * 0.004) * o.bob * (1 - Math.min(1, sp * 1.2));
      wrap.style.transform =
        'translate(' + d.x + 'px,' + (d.y + bob) + 'px)' +
        ' translate(' + (centre.x - 50) + '%,' + (centre.y - 50) + '%)' +
        ' scaleX(' + d.flip + ') rotate(' + d.bank + 'deg)';
      if (orb) orb.style.transform = 'translate(' + mouse.x + 'px,' + mouse.y + 'px)';
      return sp;
    }

    // ---- presence -------------------------------------------------------
    // Three things have to agree before the entrance counts down: the tab is
    // visible, the window has focus (alt-tabbing to an editor leaves the tab
    // 'visible' but unfocused), and she is actually on screen. Any change
    // rewinds her, so the entrance is never something that happened while you
    // were looking elsewhere.
    function present() {
      return document.visibilityState === 'visible' && document.hasFocus() && seen;
    }
    function rewind() { phase = 'hold'; phaseAt = null; pose = 0; poseAt(0); }
    function onPresence() {
      var now = present();
      if (now === here) return;      // duplicate event, not a real transition
      here = now;
      rewind();
    }
    document.addEventListener('visibilitychange', onPresence);
    window.addEventListener('focus', onPresence);
    window.addEventListener('blur', onPresence);

    var io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        seen = es[0].isIntersecting;
        onPresence();
      }, { threshold: 0.15 });
      io.observe(host);
    }
    here = present();
    rewind();

    // ---- the frame ------------------------------------------------------
    // One clock: everything is stamped against the rAF timestamp, so the
    // entrance, the playback and the flight can never disagree on the time.
    function frame(now) {
      if (dead) return;
      var dt = now - (last || now); last = now;
      if (dt > 50) dt = 50;             // a stalled tab shouldn't launch her across the box

      var sp = o.follow ? fly(now, dt) : 0;

      if (phaseAt === null) phaseAt = now;
      if (o.autoplay && phase === 'hold' && now - phaseAt >= o.entrance) {
        phase = 'play'; phaseAt = now;
      }

      if (mode === 'speed') {
        if (phase === 'hold') pose = 0;
        else {
          var rest = awake && (now - lastMove) > 120 && (now - lastMove) < 5120;
          if (!rest) pose += (Math.min(1, sp / o.maxSpeed) * SPAN - pose) * o.ease * dt / 16;
        }
        poseAt(pose);
      } else if (phase === 'play') {
        pose = Math.min(SPAN, now - phaseAt);
        poseAt(pose);
        if (pose >= SPAN) {
          if (o.loop) { phase = 'hold'; phaseAt = now; pose = 0; poseAt(0); }
          else phase = 'done';          // hold the last frame; stop writing
        }
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    function handle() {
      return {
        el: host,
        node: wrap,
        pose: function (ms) { pose = ms; poseAt(ms); return this; },
        play: function () { phase = 'play'; phaseAt = null; return this; },
        rewind: function () { rewind(); return this; },
        destroy: function () {
          dead = true;
          if (raf) cancelAnimationFrame(raf);
          if (io) io.disconnect();
          document.removeEventListener('visibilitychange', onPresence);
          window.removeEventListener('focus', onPresence);
          window.removeEventListener('blur', onPresence);
          host.removeEventListener('mousemove', onMove);
          host.removeEventListener('touchmove', onMove);
          if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
          if (orb && orb.parentNode) orb.parentNode.removeChild(orb);
          host.classList.remove('dgn', 'dgn-follow');
        }
      };
    }
    return handle();
  }

  // ---- auto-mount anything marked up for it ------------------------------
  function auto() {
    var els = document.querySelectorAll('[data-dragon]'), i;
    for (i = 0; i < els.length; i++) {
      if (!els[i].__dragon) els[i].__dragon = mount(els[i], {});
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', auto);
  } else {
    auto();
  }

  return { mount: mount, auto: auto, span: SPAN, version: '1.0.0' };
});
