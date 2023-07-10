import { create } from '@voxelified/svelte-localisation';

import data from './data';
import { LOCALES } from '../constants';
const numFormatter = new Intl.NumberFormat();
const [t, trans, locale] = create(LOCALES[0], data, LOCALES, {
	s: value => parseInt(value) === 1 ? '' : 's',
	number: value => numFormatter.format(parseInt(value)),
	time_ago: (value, trans) => {
		const date = new Date(value);
		const diff = Date.now() - date.getTime();
		const year = Math.floor(diff / 31536000000);
		if (year > 0)
			return trans(ta(5, year), [year]);

		const month = Math.floor(diff / 2628000000);
		if (month > 0)
			return trans(ta(4, month), [month]);

		const day = Math.floor(diff / 86400000);
		if (day > 0) {
			const hrs = date.getHours();
			const mins = date.getMinutes();
			return trans(ta(3, day), [day, (hrs % 12) + 1, mins > 9 ? mins : `0${mins}`, hrs > 11 ? 'PM' : 'AM']);
		}

		const hour = Math.floor(diff / 3600000);
		if (hour > 0)
			return trans(ta(2, hour), [hour]);

		const minute = Math.floor(diff / 60000);
		if (minute > 0)
			return trans(ta(1, minute), [minute]);

		const second = Math.floor(diff / 1000);
		if (!second)
			return trans('time_ago.0_1');
		return trans(ta(0, second), [second]);
	}
});

const ta = (id: number, val: number): any => `time_ago.${id}_${val === 1 ? 1 : 0}`;
export { t, trans, locale };