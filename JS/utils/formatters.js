const Format = {

    time(time) {

        if (!time) return "";

        const [hour, minute] = time.split(":");

        const date = new Date();

        date.setHours(hour, minute);

        return date.toLocaleTimeString([], {

            hour: "numeric",
            minute: "2-digit",
            hour12: true

        });

    },

    date(dateString) {

        if (!dateString) return "";

        const date = new Date(dateString);

        return date.toLocaleDateString([], {

            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"

        });

    },

    shortDate(dateString) {

        if (!dateString) return "";

        const date = new Date(dateString);

        return date.toLocaleDateString([], {

            month: "short",
            day: "numeric"

        });

    },

    currentDate() {

        return new Date().toLocaleDateString([], {

            weekday: "long",
            month: "long",
            day: "numeric"

        });

    },

    currentTime() {

        return new Date().toLocaleTimeString([], {

            hour: "numeric",
            minute: "2-digit",
            second: "2-digit",
            hour12: true

        });

    }

};