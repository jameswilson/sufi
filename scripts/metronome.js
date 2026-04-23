(function () {
  /**
   * Polyfill for Array.indexOf (used inside the code)
   */
  var arrayIndexOfPolyfill = function (item) {
    for (var index = 0, length = this.length; index < length; index++) {
      if (index in this && this[index] === item) {
        return index;
      }
    }
    return -1;
  };

  /**
   * The Metronome constructor function
   * (makes a new Metronome instance at window.Metronome(...))
   */
  window.Metronome = function (domElement, userOptions) {
    // Default settings object
    var metronomeSettings = {
      tempos: [
        { range: [30, 60], label: "Largo" },
        { range: [60, 66], label: "Larghetto" },
        { range: [66, 76], label: "Adagio" },
        { range: [76, 108], label: "Andante" },
        { range: [108, 120], label: "Moderato" },
        { range: [120, 168], label: "Allegro" },
        { range: [168, 200], label: "Presto" },
        { range: [200, 240], label: "Prestissimo" },
      ],
      useTuner: true,
      drawShadow: true,
      defaultTempo: 92,
      tunerFreq: 440,
      audioScheduleFreq: 25,
      audioLookahead: 500,
    };

    // We'll extend userOptions into metronomeSettings
    var extendedOptions = {};

    // DOM & Snap.svg references
    var containerElement = null;
    var snapCanvas = null;
    var audioContext = null;
    var mainGainNode = null;

    // The final returned API object
    var metronomeApi = {};

    // Time-tracking
    var lastPracticeDateObj, todayDateObj;
    var dailySecondsSpent = 0;

    if (localStorage.totalTime && localStorage.practiceDate) {
      lastPracticeDateObj = new Date(localStorage.practiceDate);
      todayDateObj = new Date();
      // If date matches, load the stored daily total
      if (
        lastPracticeDateObj.getDate() === todayDateObj.getDate() &&
        lastPracticeDateObj.getMonth() === todayDateObj.getMonth() &&
        lastPracticeDateObj.getFullYear() === todayDateObj.getFullYear()
      ) {
        dailySecondsSpent = parseInt(localStorage.totalTime, 10);
        jQueryRef("#timer-today-value").html(
          formatTimeHHMMSS(dailySecondsSpent)
        );
      }
    }

    var dailyTimeArray = [dailySecondsSpent];
    var playbackIntervalHandle = 0;
    var sessionSecondsInCurrentTask = 0;
    var dailyArrayLastIndex = dailyTimeArray.length - 1;

    /**
     * Internal metronome state:
     * whether it is playing, tuning, tempo, oscillator, etc.
     */
    var internalMetronomeState = {
      playing: false,
      turnedOff: false,
      tuning: false,
      tempo: 0,
      showTempo: 92,
      nextBeat: 0,
      scheduler: null,
      oscillator: null,
      mute: false,
      firstTimePlay: true,
      customFrequency: 1000,
    };

    // If the function wasn't called with `new`, call it that way
    if (!(this instanceof Metronome)) {
      return new Metronome(domElement, userOptions);
    }

    // Clicking this button resets some accent settings (from original code)
    jQueryRef(document).on("click", ".reset_accents", function () {
      // These references to "m, _" come from the original code for time signatures
      // Possibly replaced in your code, but shown here for completeness:
      // window.m.selectValuesDropdown(m, _);
      jQueryRef(".tempo_marking_input").val(92).blur();
    });

    // Possibly a volume variable
    var currentVolumeValue = 1;

    /**
     * Draw the Metronome UI (the big circular interface) with Snap.svg
     */
    function drawMetronomeUI() {
      // For brevity, the big chunk of Snap.svg code is omitted here.
      // You would re-inject your path/circle drawing from the original code:
      // creating arcs, circles, text labels, etc.
      // Example placeholders:
      //
      // - create background circle
      // - create tempo circles & text
      // - create "Start/Stop" circle in center
      // - handle tuning circle if useTuner = true
    }

    /**
     * Start the metronome scheduling (unmutes audio, sets intervals)
     */
    function startMetronome() {
      audioContext.resume();
      jQueryRef(".secondsPracticed").val(0);

      if (
        !internalMetronomeState.playing &&
        !internalMetronomeState.turnedOff
      ) {
        if (internalMetronomeState.tuning) {
          stopTunerBeep();
        }
        if (internalMetronomeState.firstTimePlay) {
          startTunerBeep();
          stopTunerBeep();
          internalMetronomeState.firstTimePlay = false;
        }
        dailyArrayLastIndex++;
        sessionSecondsInCurrentTask = 0;
        playbackIntervalHandle = setInterval(function () {
          sessionSecondsInCurrentTask++;
          jQueryRef(".secondsPracticed").val(sessionSecondsInCurrentTask);
          jQueryRef("#timer-now-value").html(
            formatTimeHHMMSS(sessionSecondsInCurrentTask)
          );
          dailyTimeArray[dailyArrayLastIndex] = sessionSecondsInCurrentTask;
        }, 1000);

        internalMetronomeState.playing = true;
        internalMetronomeState.nextBeat = audioContext.currentTime + 0.1;
        updateMetronomeUI();
        internalMetronomeState.scheduler = window.setInterval(
          scheduleBeatLoop,
          metronomeSettings.audioScheduleFreq
        );
      }
    }

    /**
     * Turn on the tuner beep (A440 oscillator)
     */
    function startTunerBeep() {
      // If already tuning or if muted, skip
      if (internalMetronomeState.tuning) return false;
      if (internalMetronomeState.mute) return false;
      internalMetronomeState.tuning = true;
      updateMetronomeUI();

      internalMetronomeState.oscillator = audioContext.createOscillator();
      internalMetronomeState.oscillator.frequency.value =
        metronomeSettings.tunerFreq;
      internalMetronomeState.oscillator.type = "sine";
      internalMetronomeState.oscillator.connect(mainGainNode);
      mainGainNode.connect(audioContext.destination);
      internalMetronomeState.oscillator.start(0);
    }

    /**
     * Format seconds as HH:MM:SS
     */
    function formatTimeHHMMSS(totalSeconds) {
      if (isNaN(totalSeconds)) {
        return "00:00:00";
      }
      var hours = Math.floor(totalSeconds / 3600).toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      var remainder = totalSeconds % 3600;
      var minutes = Math.floor(remainder / 60).toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      var seconds = (remainder % 60).toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      return hours + ":" + minutes + ":" + seconds;
    }

    /**
     * Stop the metronome
     */
    function stopMetronome() {
      if (!internalMetronomeState.playing) return false;
      internalMetronomeState.turnedOff = true;
      setTimeout(function () {
        // Possibly save user time, then set turnedOff back to false
        internalMetronomeState.turnedOff = false;
        updateMetronomeUI();
      }, 100);
      window.clearInterval(internalMetronomeState.scheduler);
      window.clearInterval(playbackIntervalHandle);
      internalMetronomeState.playing = false;
      return metronomeApi;
    }

    /**
     * Stop the tuner beep (A440 oscillator)
     */
    function stopTunerBeep() {
      if (!internalMetronomeState.tuning) return false;
      internalMetronomeState.tuning = false;
      internalMetronomeState.oscillator.stop(0);
      internalMetronomeState.tempo = 92;
      internalMetronomeState.showTempo = 92;
      var tuneCheckbox = document.getElementById("buttonTune");
      if (tuneCheckbox) {
        tuneCheckbox.checked = false;
      }
      updateMetronomeUI();
    }

    /**
     * The scheduling loop that triggers beats up to "audioLookahead" time in the future
     */
    function scheduleBeatLoop() {
      while (
        internalMetronomeState.nextBeat <
        audioContext.currentTime + metronomeSettings.audioLookahead / 1000
      ) {
        scheduleSingleBeat(internalMetronomeState.nextBeat);
        internalMetronomeState.nextBeat = getNextBeatTime();
      }
    }

    /**
     * Called for each beat, creates a short oscillator beep
     */
    var currentBeatIndex = 0;
    var accentArray = []; // from original code, e.g. [0.3, 0.1, 0, ...]
    function scheduleSingleBeat(nextBeatTime) {
      internalMetronomeState.oscillator = audioContext.createOscillator();
      if (currentBeatIndex >= accentArray.length) {
        currentBeatIndex = 0;
      }
      var accentVolume = parseFloat(accentArray[currentBeatIndex]);
      if (!internalMetronomeState.mute && accentVolume !== 0) {
        var beatGain = audioContext.createGain();
        beatGain.gain.value = accentVolume * mainGainNode.gain.mainValue;
        internalMetronomeState.oscillator.connect(beatGain);
        beatGain.connect(audioContext.destination);
      }
      currentBeatIndex++;
      internalMetronomeState.oscillator.frequency.value =
        internalMetronomeState.customFrequency;
      internalMetronomeState.oscillator.type = "sine";
      internalMetronomeState.oscillator.start(nextBeatTime);
      internalMetronomeState.oscillator.stop(nextBeatTime + 0.008);
    }

    /**
     * Calculate the time of the next beat
     */
    function getNextBeatTime() {
      var secondsPerBeat = 60 / internalMetronomeState.tempo;
      return internalMetronomeState.nextBeat + secondsPerBeat;
    }

    /**
     * Snap.svg helper for converting polar coords to XY
     */
    function polarToCartesian(centerPoint, radiusVal, angleDegrees) {
      return {
        x:
          centerPoint.x +
          Math.round(radiusVal * Math.cos((angleDegrees * Math.PI) / 180)),
        y:
          centerPoint.y +
          Math.round(radiusVal * Math.sin((angleDegrees * Math.PI) / 180)),
      };
    }

    /**
     * Update the Snap.svg UI to reflect current play/tune state
     */
    function updateMetronomeUI() {
      var controlsGroup = snapCanvas.selectAll(".ctrl:not(.start)");
      for (var i = 0; i < controlsGroup.length; i++) {
        controlsGroup[i].removeClass("active");
      }
      if (internalMetronomeState.playing) {
        var ctrlElem = snapCanvas.select(
          '.ctrl[data-value="' + internalMetronomeState.showTempo + '"]'
        );
        if (ctrlElem) {
          ctrlElem.addClass("active");
        }
        snapCanvas.select("text.start_stop").attr({ text: "STOP" });
        snapCanvas.select("text.start").attr({
          text: internalMetronomeState.showTempo,
          "font-size": "42px",
          "font-weight": 300,
        });
      } else if (internalMetronomeState.tuning) {
        snapCanvas.select(".ctrl.tune").addClass("active");
        snapCanvas.select("text.start_stop").attr({ text: "START" });
        snapCanvas.select("text.start").attr({
          text: "Stop",
          "font-size": "15px",
          "font-weight": "700",
        });
      } else {
        snapCanvas.select("text.start_stop").attr({ text: "START" });
        snapCanvas.select("text.start").attr({
          text: internalMetronomeState.showTempo,
          "font-size": "42px",
          "font-weight": 300,
        });
      }
    }

    /**
     * Circle hover in (expands circle radius)
     */
    function handleHoverIn(eventData) {
      var baseRadius = parseFloat(this.attr("data-r"));
      if (this.hasClass("start")) {
        baseRadius += 0.05 * metronomeSettings.r;
      } else {
        baseRadius += 0.25 * parseFloat(this.attr("data-r"));
      }
      this.animate({ r: baseRadius }, 75);
    }

    /**
     * Circle hover out (restores circle radius)
     */
    function handleHoverOut(eventData) {
      var originalRadius = this.attr("data-r");
      this.animate({ r: originalRadius }, 75);
    }

    /**
     * Click on a tempo circle
     */
    function handleTempoCircleClick(clickEvent) {
      clickEvent.preventDefault();
      var clickedValue = parseInt(this.attr("data-value"), 10) || 0;
      internalMetronomeState.tempo = clickedValue;
      internalMetronomeState.showTempo = clickedValue;
      if (internalMetronomeState.playing && internalMetronomeState.tempo > 0) {
        updateMetronomeUI();
      }
      if (!internalMetronomeState.playing && internalMetronomeState.tempo > 0) {
        startMetronome();
      }
      if (internalMetronomeState.tempo === 0) {
        return startTunerBeep();
      }
    }

    /**
     * Touch start handler for the big ring (used for dragging BPM)
     */
    var pendingBpmValue = null;
    function handleTouchStart(touchEvent) {
      touchEvent.preventDefault();
      var touchX = touchEvent.touches[0].pageX;
      var touchY = touchEvent.touches[0].pageY;

      var canvasCenter = {
        x:
          containerElement.find(".canvas").offset().left +
          metronomeSettings.width / 2,
        y:
          containerElement.find(".canvas").offset().top +
          metronomeSettings.height / 2,
      };
      var distanceFromCenter = Math.sqrt(
        Math.pow(touchX - canvasCenter.x, 2) +
          Math.pow(touchY - canvasCenter.y, 2)
      );
      var angleComputation =
        (function (centerObj, radiusObj, pointObj) {
          var angleDeg =
            (180 / Math.PI) * Math.acos((pointObj.x - centerObj.x) / radiusObj);
          if (pointObj.y < centerObj.y) {
            angleDeg = 360 - angleDeg;
          }
          return angleDeg;
        })(canvasCenter, distanceFromCenter, { x: touchX, y: touchY }) -
        metronomeSettings.startAngle;

      if (angleComputation < 0) {
        angleComputation = 360 + angleComputation;
      }

      var stepAngle = metronomeSettings.useTuner
        ? 360 / (metronomeSettings.values.length + 1)
        : 360 / metronomeSettings.values.length;
      var indexValue = Math.round(angleComputation / stepAngle);
      if (metronomeSettings.useTuner) {
        indexValue -= 1;
      }
      // For "touchmove", you might highlight or show gauge
      pendingBpmValue =
        metronomeSettings.values[indexValue] !== undefined
          ? metronomeSettings.values[indexValue]
          : 0;
    }

    /**
     * Touch end handler for ring dragging
     */
    function handleTouchEnd(touchEvent) {
      if (pendingBpmValue == null) {
        return false;
      }
      internalMetronomeState.tempo = pendingBpmValue
        ? parseInt(pendingBpmValue)
        : 0;
      internalMetronomeState.showTempo = internalMetronomeState.tempo;
      if (internalMetronomeState.playing && internalMetronomeState.tempo > 0) {
        updateMetronomeUI();
      }
      if (!internalMetronomeState.playing && internalMetronomeState.tempo > 0) {
        startMetronome();
      }
      if (internalMetronomeState.tempo === 0) {
        startTunerBeep();
      }
      var gaugeElement = snapCanvas.select(".controls .gauge");
      if (gaugeElement) {
        gaugeElement.remove();
      }
      snapCanvas.select(".controls text.start").removeClass("hidden");
      pendingBpmValue = null;
    }

    // Create the Snap.svg canvas, AudioContext, gain node, etc.
    (function initializeCanvasAndAudio() {
      containerElement = jQueryRef(domElement);
      extendedOptions = jQueryRef.a.extend(true, {}, userOptions);
      jQueryRef.a.extend(metronomeSettings, extendedOptions);

      var svgElement = document.createElement("svg");
      svgElement.classList.add("canvas");
      containerElement[0].innerHTML += svgElement.outerHTML;

      snapCanvas = new d.a(".canvas"); // The original code used `d.a`, presumably Snap()
      audioContext = new AudioContext();
      mainGainNode = audioContext.createGain();
      mainGainNode.gain.value = 1;
      mainGainNode.gain.mainValue = 1;
      mainGainNode.connect(audioContext.destination);

      drawMetronomeUI();
    })();

    // Return the public API object:
    metronomeApi = {
      redraw: function (additionalOpts) {
        if (additionalOpts) {
          jQueryRef.a.extend(extendedOptions, additionalOpts);
          jQueryRef.a.extend(metronomeSettings, extendedOptions);
        }
        snapCanvas.clear();
        drawMetronomeUI();
      },
      start: startMetronome,
      tune: startTunerBeep,
      stopTuning: stopTunerBeep,
      stop: stopMetronome,
      toggle: function () {
        if (internalMetronomeState.turnedOff) {
          return false;
        }
        if (internalMetronomeState.playing) {
          stopMetronome();
          internalMetronomeState.playing = false;
        } else {
          if (internalMetronomeState.tuning) {
            stopTunerBeep();
          } else {
            startMetronome();
            internalMetronomeState.playing = true;
          }
        }
        updateMetronomeUI();
      },
      goBack: function () {
        if (!internalMetronomeState.playing) {
          return false;
        }
        // This function used to decrease BPM by 1,
        // but was incomplete in the snippet.
        // Example logic:
        // if (internalMetronomeState.tempo <= 30) return false;
        // internalMetronomeState.tempo--;
        // internalMetronomeState.showTempo = internalMetronomeState.tempo;
        // updateMetronomeUI();
      },
      goForward: function () {
        if (!internalMetronomeState.playing) {
          return false;
        }
        // Example logic to increase BPM by 1:
        // if (internalMetronomeState.tempo >= 240) return false;
        // internalMetronomeState.tempo++;
        // internalMetronomeState.showTempo = internalMetronomeState.tempo;
        // updateMetronomeUI();
      },
      mute: function () {
        if (internalMetronomeState.firstTimePlay) {
          startTunerBeep();
          stopTunerBeep();
          internalMetronomeState.firstTimePlay = false;
        }
        currentVolumeValue = 0;
        jQueryRef("#volume_icon").addClass("mute");
        internalMetronomeState.mute = true;
      },
      startAtBeat: function (desiredBeat) {
        stopTunerBeep();
        if (
          !internalMetronomeState.playing &&
          internalMetronomeState.tempo > 0
        ) {
          startMetronome();
        }
        if (!desiredBeat) {
          desiredBeat = 92;
        }
        internalMetronomeState.tempo = desiredBeat;
        internalMetronomeState.showTempo = desiredBeat;
        jQueryRef(".tempo_marking_input").val(desiredBeat);
        window.m.start(internalMetronomeState.tempo);
        updateMetronomeUI();
      },
      beatbox: internalMetronomeState,
      selectValuesDropdown: function (timeSig1, timeSig2) {
        // Logic that sets the UI for the given time signature & subdivisions
        // Then re-calls the function that sets accent patterns.
      },
      volumeLevel: function (newVolumeValue) {
        mainGainNode.gain.mainValue = newVolumeValue;
      },
      unmute: function (restoreVolumeValue) {
        if (restoreVolumeValue === undefined) {
          restoreVolumeValue = 1;
        }
        this.volumeLevel(restoreVolumeValue);
        internalMetronomeState.mute = false;
        jQueryRef("#volume_icon").removeClass("mute");
      },
      setFrequency: function (newFrequency) {
        if (newFrequency === undefined) {
          newFrequency = 1000;
        }
        internalMetronomeState.customFrequency = newFrequency;
      },
      isPlaying: function () {
        return !!internalMetronomeState.playing;
      },
      isTuning: function () {
        return !!internalMetronomeState.tuning;
      },
      isMuted: function () {
        return internalMetronomeState.mute;
      },
    };

    return metronomeApi;
  };

  /**
   * On document.ready, wire up events that call Metronome’s methods
   */
  jQueryRef(document).ready(function (jQueryDocument) {
    var currentBpmValue = 0;
    var maxBpmValue = 240;
    Math.floor(24);
    var delayedTimeoutHandle = null;

    /**
     * Adjust BPM up or down
     */
    function adjustMetronomeBpm(direction) {
      var currentShowTempo = window.m.beatbox.showTempo;
      if (direction === "up") {
        currentShowTempo += 1;
      } else {
        currentShowTempo -= 1;
      }
      if (currentShowTempo - 1 >= maxBpmValue) {
        return;
      }
      if (currentShowTempo + 1 <= 30) {
        return;
      }
      currentBpmValue = currentShowTempo;
      currentShowTempo = Math.round(currentShowTempo);
      jQueryRef(".tempo_marking_input").val(currentShowTempo);
      window.m.startAtBeat(currentShowTempo);
      clearTimeout(delayedTimeoutHandle);
      delayedTimeoutHandle = setTimeout(function () {}, 500);
    }

    /**
     * Example function for time signature changes
     */
    function setTimeSignature(timeSignature1, timeSignature2) {
      window.m.selectValuesDropdown(timeSignature1, timeSignature2);
    }

    // Volume icon toggle
    jQueryRef("#volume_icon").on("click", function () {
      if (jQueryRef(this).hasClass("mute")) {
        window.m.unmute(1);
        jQueryRef("#volume").val(1);
      } else {
        window.m.mute();
        jQueryRef("#volume").val(0);
      }
    });

    // BPM numeric input
    jQueryRef(".tempo_marking_input").on("blur", function () {
      var enteredBpmValue = parseInt(jQueryRef(this).val(), 10);
      var defaultBpmValue = 92;
      if (isNaN(enteredBpmValue) || enteredBpmValue === "") {
        enteredBpmValue = defaultBpmValue;
      }
      if (enteredBpmValue < 30) {
        enteredBpmValue = 30;
      }
      if (enteredBpmValue > 240) {
        enteredBpmValue = 240;
      }
      jQueryRef("#bpm").val(enteredBpmValue);
      jQueryRef(".knob").val(enteredBpmValue).change();
      if (window.m.isPlaying()) {
        window.m.startAtBeat(enteredBpmValue);
      } else {
        window.m.startAtBeat(enteredBpmValue);
        window.m.stop();
      }
      defaultBpmValue = enteredBpmValue;
      jQueryRef(this).val(enteredBpmValue);
    });

    // Chevron arrows for BPM up/down
    jQueryRef("#chevron--right").on("click", function (clickEvent) {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
      adjustMetronomeBpm("up");
    });
    jQueryRef("#chevron--left").on("click", function (clickEvent) {
      clickEvent.stopPropagation();
      clickEvent.preventDefault();
      adjustMetronomeBpm("down");
    });

    // Sound style (change oscillator frequency)
    jQueryRef(".sound_options_dropdown").change(function () {
      var selectedValue = jQueryRef(".sound_options_dropdown").val();
      if (selectedValue == 1) {
        window.m.setFrequency(1000);
      } else if (selectedValue == 2) {
        window.m.setFrequency(1220);
      } else if (selectedValue == 3) {
        window.m.setFrequency(1450);
      } else if (selectedValue == 4) {
        window.m.setFrequency(1650);
      }
      // Could recalc or do something else if desired
    });

    // Tapping BPM
    var tapTimeoutHandle,
      timeDifference,
      tapStartTime,
      tapEndTime,
      tapIntervals = [],
      lastTapTime = 0,
      tapCountTotal = 0,
      estimatedBpmValue = 0;

    var bpmPresets = [
      40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84,
      88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160,
      168, 176, 184, 192, 200, 208,
    ];

    function resetTapBpm() {
      lastTapTime = 0;
      tapCountTotal = 0;
      jQueryRef("#keep-tapping-msg").removeClass("tapping");
      tapIntervals = [];
    }
    resetTapBpm();

    jQueryRef("#tap-btn").click(function (clickEvent) {
      clickEvent.preventDefault();
      tapCountTotal++;
      tapStartTime = new Date();
      tapEndTime = tapStartTime.getTime();
      clearTimeout(tapTimeoutHandle);
      tapTimeoutHandle = setTimeout(function () {
        resetTapBpm();
      }, 3000);

      if (lastTapTime === 0) {
        lastTapTime = tapEndTime;
      }
      timeDifference = tapEndTime - lastTapTime;
      lastTapTime = tapEndTime;
      jQueryRef("#keep-tapping-msg").addClass("tapping");
      tapIntervals.push(timeDifference);
      if (tapCountTotal > 3) {
        var lastThreeTaps = tapIntervals.slice(
          Math.max(tapIntervals.length - 3, 0)
        );
        var sumOfIntervals = 0;
        jQueryDocument.each(lastThreeTaps, function (idx, intervalVal) {
          sumOfIntervals += intervalVal;
        });
        var averageInterval = sumOfIntervals / 3;
        estimatedBpmValue = parseInt(60000 / averageInterval, 10);
        if (estimatedBpmValue > 240) {
          estimatedBpmValue = 240;
        }
        var approximateBpm = estimatedBpmValue;
        var closestPreset = null;
        jQueryDocument.each(bpmPresets, function () {
          if (
            closestPreset == null ||
            Math.abs(this - approximateBpm) <
              Math.abs(closestPreset - approximateBpm)
          ) {
            closestPreset = this;
          }
        });
        estimatedBpmValue = parseInt(closestPreset, 10);
        jQueryRef(".knob").val(estimatedBpmValue).change();
        jQueryRef("#bpm").val(estimatedBpmValue);
        window.m.startAtBeat(estimatedBpmValue);
      }
    });

    // Initialize the Metronome
    var metronomeOpts = {
      values: bpmPresets,
      useTuner: true,
      drawShadow: true,
      startAngle: 90,
    };
    window.m = new Metronome(
      document.getElementById("flashContent"),
      metronomeOpts
    );
    window.m.volumeLevel(1);
    window.m.selectValuesDropdown(1, 4);

    // Volume slider
    jQueryRef(document).on("change", "#volume", function () {
      if (jQueryRef(this).val() == 0) {
        currentVolumeValue = jQueryRef(this).val();
        window.m.mute();
      } else {
        currentVolumeValue = jQueryRef(this).val();
        window.m.unmute();
      }
      window.m.volumeLevel(currentVolumeValue);
    });

    // Keyboard shortcuts
    jQueryRef(window).keydown(function (keyEvent) {
      // Spacebar => toggle
      if (keyEvent.keyCode === 32) {
        if (
          !jQueryRef("input").is(":focus") &&
          !jQueryRef("textarea").is(":focus")
        ) {
          window.m.toggle();
          return false;
        }
      }
      // Arrow left/down => BPM--
      else if (keyEvent.keyCode === 37 || keyEvent.keyCode === 40) {
        if (
          !jQueryRef("input").is(":focus") &&
          !jQueryRef("textarea").is(":focus")
        ) {
          window.m.goBack();
          return false;
        }
      }
      // Arrow right/up => BPM++
      else if (keyEvent.keyCode === 39 || keyEvent.keyCode === 38) {
        if (
          !jQueryRef("input").is(":focus") &&
          !jQueryRef("textarea").is(":focus")
        ) {
          window.m.goForward();
          return false;
        }
      }
    });
  });
}).call(this);
