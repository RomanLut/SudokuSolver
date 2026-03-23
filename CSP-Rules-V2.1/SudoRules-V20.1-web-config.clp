;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;; Browser-specific SudoRules configuration.
;;; This keeps the regular solver path but redirects it to a virtual FS root and a web-safe loader.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(clear)

(defglobal ?*Operating-System* = UNIX)
(defglobal ?*Directory-symbol* = "/")
(defglobal ?*CSP-Rules* = "/")
(defglobal ?*Clips-version* = "6.3-wasm")
(defglobal ?*Computer-description* = "Browser WebAssembly runtime")

(defglobal ?*Application* = "SudoRules")
(defglobal ?*Application-VersionNumber* = 20.1)

(defglobal ?*CSP-Rules-current-version* = (str-cat ?*CSP-Rules* "csp" ?*Directory-symbol*))
(defglobal ?*CSP-Rules-Generic-Dir* = (str-cat ?*CSP-Rules-current-version* "CSP-Rules-Generic" ?*Directory-symbol*))
(defglobal ?*CSP-Rules-Generic-Loader* = (str-cat ?*CSP-Rules-Generic-Dir* "CSP-Rules-Generic-Web-Loader.clp"))

(defglobal ?*Application-Dir* = (str-cat ?*CSP-Rules-current-version* ?*Application* "-V" ?*Application-VersionNumber* ?*Directory-symbol*))
(defglobal ?*Application-Loader* = (str-cat ?*Application-Dir* "SudoRules-Web-Loader.clp"))

(load (str-cat ?*CSP-Rules-Generic-Dir* "GENERAL" ?*Directory-symbol* "globals.clp"))
(load (str-cat ?*Application-Dir* "GENERAL" ?*Directory-symbol* "globals.clp"))

(bind ?*print-main-levels* TRUE)

;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;;; Same active theory as the existing local setup: W + Subsets + FinnedFish
;;; + bivalue chains + z-chains + t-whips + whips.
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

(bind ?*Subsets* TRUE)
(bind ?*FinnedFish* TRUE)
(bind ?*Bivalue-Chains* TRUE)
(bind ?*z-Chains* TRUE)
(bind ?*t-Whips* TRUE)
(bind ?*Whips* TRUE)

(bind ?*Whips[1]* TRUE)

;;; Keep the same load sequence as the native configuration:
;;; the generic loader performs the application-specific load itself.
(redefine-internal-factors)

(if (check-config-selection) then (batch ?*CSP-Rules-Generic-Loader*))

(reset)
