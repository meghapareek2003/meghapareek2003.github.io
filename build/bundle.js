
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function (d3) {
    'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var d3__namespace = /*#__PURE__*/_interopNamespaceDefault(d3);

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.58.0' }, detail), { bubbles: true }));
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/App.svelte generated by Svelte v3.58.0 */

    const { console: console_1 } = globals;

    function create_fragment(ctx) {
    	const block = {
    		c: noop,
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let geojsondata;
    	let csvdata;

    	onMount(async () => {
    		// Load geoJSON and CSV data
    		const geojsonPromise = d3__namespace.json('/county.geojson');

    		const csvPromise = d3__namespace.csv('/county_rate.csv');
    		const [geojsonResult, csvResult] = await Promise.all([geojsonPromise, csvPromise]);

    		let dataMap = new Map(csvResult.map(item => {
    				return [
    					item.County,
    					[
    						item.County_Rate,
    						item.Cancer,
    						item.Diabetes,
    						item.Heart,
    						item.Liver,
    						item.Total_Population
    					]
    				];
    			}));

    		// Merge properties with GeoJSON features
    		geojsonResult.features.forEach(feature => {
    			const countyName = feature.properties.CountyName;
    			const deathRate = dataMap.get(countyName)[0];
    			const cancer = dataMap.get(countyName)[1];
    			const diabetes = dataMap.get(countyName)[2];
    			const heart = dataMap.get(countyName)[3];
    			const liver = dataMap.get(countyName)[4];
    			const population = dataMap.get(countyName)[5];
    			feature.properties.deathRate = deathRate ? parseFloat(deathRate) : 0;
    			feature.properties.cancer = cancer ? parseInt(cancer) : 0;
    			feature.properties.diabetes = diabetes ? parseInt(diabetes) : 0;
    			feature.properties.heart = heart ? parseInt(heart) : 0;
    			feature.properties.liver = liver ? parseInt(liver) : 0; // Assign death rate or 0 if not found
    			feature.properties.population = population ? parseInt(population) : 0;
    		});

    		geojsondata = geojsonResult;
    		csvdata = csvResult;
    		console.log(csvdata.map(d => d.County_Rate));

    		// Setup the SVG canvas
    		const width = 1200, height = 650;

    		const svg = d3__namespace.select("#map").append("svg").attr("width", width).attr("height", height);
    		const g = svg.append("g");

    		// Setup projection and path generator
    		const projection = d3__namespace.geoMercator().fitSize([width, height], geojsondata);

    		const path = d3__namespace.geoPath().projection(projection);

    		const colorScale = d3__namespace.scaleLinear().domain([0, 5, 10, 15, 20]).range(['#f7fbff', '#deebf7', '#9ecae1', '#4292c6', '#08306b']).interpolate(d3__namespace.interpolateHcl); // Input domain breaks
    		// Corresponding colors
    		// Use HCL interpolation for smooth color transitions

    		const svgLegend = d3__namespace.select("#legend-container").append("svg").attr("width", 480).attr("height", 80);
    		const gradient = svgLegend.append("defs").append("linearGradient").attr("id", "gradient").attr("x1", "0%").attr("x2", "100%").attr("y1", "0%").attr("y2", "0%");

    		colorScale.range().forEach((color, i, array) => {
    			gradient.append("stop").attr("offset", `${i / (array.length - 1) * 100}%`).attr("stop-color", color);
    		});

    		// Draw the rectangle for the gradient
    		svgLegend.append("rect").attr("x", 60).attr("y", 30).attr("width", 300).attr("height", 20).style("fill", "url(#gradient)");

    		// Add legend title
    		svgLegend.append("text").attr("x", 180).attr("y", 20).attr("text-anchor", "middle").style("font-weight", "bold").text("Deaths From Chronic Disease per 1000 people");

    		// Add legend labels
    		const legendValues = [0, 5, 10, 15, 20];

    		legendValues.forEach((value, i) => {
    			svgLegend.append("text").attr("x", 10 + i * (350 / (legendValues.length - 1))).attr("y", 70).style("text-anchor", "middle").text(value);
    		});

    		function showPopup(content, x, y) {
    			const tooltip = d3__namespace.select('.tooltip');
    			tooltip.html(content).style('left', `${x}px`).style('top', `${y}px`).style('opacity', 1);
    		}

    		const features = g.selectAll("path").data(geojsondata.features).enter().append("path").attr("d", path).attr("fill", d => colorScale(d.properties.deathRate)).attr("stroke", "#fff").on('click', function (event, d) {
    			// This function is triggered when a path is clicked
    			const props = d.properties; // Assuming 'path' is your geo path generator
    			// Apply the color scale based on 'deathRate'
    			// Access properties bound to the path

    			const description = `
                <strong>${props.CountyName} County</strong><br><hr>
                Deaths from Diabetes: ${props.diabetes}<br>
                Deaths from Cancer: ${props.cancer}<br>
                Deaths from Heart Disease: ${props.heart}<br>
                Deaths from Liver Disease: ${props.liver}<br>
                Population: ${props.population}<br>
            `;

    			showPopup(description, event.pageX, event.pageY);
    		});

    		// Add zoom functionality
    		const zoom = d3__namespace.zoom().scaleExtent([1, 8]).on("zoom", event => {
    			g.attr('transform', event.transform);
    		});

    		svg.call(zoom);

    		// Tooltip setup
    		const tooltip = d3__namespace.select('body').append('div').attr('class', 'tooltip').style('opacity', 0).style('position', 'absolute').style('background', 'rgba(255, 255, 255, 0.8)').style('padding', '5px').style('border-radius', '4px').style('font-family', 'Roboto, sans-serif');

    		// Tooltip interactivity
    		features.on('mouseover', (event, d) => {
    			tooltip.transition().duration(300).style('opacity', 1);
    			tooltip.html(`${d.properties.CountyName} County<br/>Click for more!`).style('left', `${event.pageX + 10}px`).style('top', `${event.pageY + 10}px`);
    		}).on('mousemove', (event, d) => {
    			tooltip.style('left', `${event.pageX + 10}px`).style('top', `${event.pageY + 10}px`);
    		}).on('mouseout', () => {
    			tooltip.transition().duration(300).style('opacity', 0);
    		});
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ d3: d3__namespace, onMount, geojsondata, csvdata });

    	$$self.$inject_state = $$props => {
    		if ('geojsondata' in $$props) geojsondata = $$props.geojsondata;
    		if ('csvdata' in $$props) csvdata = $$props.csvdata;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})(d3);
//# sourceMappingURL=bundle.js.map
