import Schedule from './Schedule.js';
import ScheduleException from './ScheduleException.js';
import Validity from './Validity.js';
import TimeProfile from './TimeProfile.js';
import TimeRange from './TimeRange.js';
import Organization from '../../organizations/models/Organization.js';

// Schedule → Organization (N:1)
Schedule.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(Schedule, { foreignKey: 'organizationId', as: 'schedules' });

// Schedule → Validity (1:N)
Schedule.hasMany(Validity, { foreignKey: 'scheduleId', as: 'validities', onDelete: 'CASCADE' });
Validity.belongsTo(Schedule, { foreignKey: 'scheduleId', as: 'schedule' });

// Validity → ScheduleException (1:N)
Validity.hasMany(ScheduleException, { foreignKey: 'validityId', as: 'exceptions', onDelete: 'CASCADE' });
ScheduleException.belongsTo(Validity, { foreignKey: 'validityId', as: 'validity' });

// Validity → TimeProfile (1:N)
Validity.hasMany(TimeProfile, { foreignKey: 'validityId', as: 'timeProfiles', onDelete: 'CASCADE' });
TimeProfile.belongsTo(Validity, { foreignKey: 'validityId', as: 'validity' });

// TimeProfile → TimeRange (1:N)
TimeProfile.hasMany(TimeRange, { foreignKey: 'timeProfileId', as: 'timeRanges', onDelete: 'CASCADE' });
TimeRange.belongsTo(TimeProfile, { foreignKey: 'timeProfileId', as: 'timeProfile' });

export { Schedule, ScheduleException, Validity, TimeProfile, TimeRange };

export default { Schedule, ScheduleException, Validity, TimeProfile, TimeRange };
