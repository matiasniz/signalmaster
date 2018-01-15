'use strict';
const Joi = require('joi');
const Duration = require('humanize-duration');
const { promisify } = require('util');

module.exports = {
  description: 'Dashboard',
  tags: ['web', 'metrics'],
  auth: 'admin',
  handler: async function (request, h) {

    const params = Object.assign({}, request.query);
    const limit = params.limit;
    params.offset = (params.page - 1) * limit;

    const redis_llen = promisify(this.redis.llen.bind(this.redis));
    const redis_get = promisify(this.redis.get.bind(this.redis));
    const redis_lindex = promisify(this.redis.lindex.bind(this.redis));

    const eventQueue = await redis_llen('events');
    const roomReportQueue = await redis_llen('rooms_destroyed');
    let eventClock = await redis_get('events_clock');
    if (eventClock) {
      eventClock = new Date(Number(eventClock));
    }
    const nextReport = await redis_lindex('rooms_destroyed', 0);
    let roomReportClock = '-';
    if (nextReport) {
      roomReportClock = new Date(JSON.parse(nextReport).created_at);
    }

    const count = await this.db.rooms.count(params);
    const activeCount = await this.db.rooms.count_active();
    const sessionCount = await this.db.sessions.count_active();
    const sessionMobileCount = await this.db.sessions.count_active_type({ session_type: 'mobile' });
    const sessionDesktopCount = await this.db.sessions.count_active_type({ session_type: 'desktop' });

    const sessionDayCount = await this.db.sessions.count_period({
      ts: new Date(),
      interval: '1 day'
    });
    const sessionWeekCount = await this.db.sessions.count_period({
      ts: new Date(),
      interval: '7 days'
    });

    const sessionMobileDayCount = await this.db.sessions.count_period_type({
      ts: new Date(),
      interval: '1 day',
      session_type: 'mobile'
    });
    const sessionMobileWeekCount = await this.db.sessions.count_period_type({
      ts: new Date(),
      interval: '7 days',
      session_type: 'mobile'
    });

    const sessionDesktopDayCount = await this.db.sessions.count_period_type({
      ts: new Date(),
      interval: '1 day',
      session_type: 'desktop'
    });
    const sessionDesktopWeekCount = await this.db.sessions.count_period_type({
      ts: new Date(),
      interval: '7 days',
      session_type: 'desktop'
    });



    const roomDayCount = await this.db.rooms.count_period({
      ts: new Date(),
      interval: '1 day'
    });
    const roomWeekCount = await this.db.rooms.count_period({
      ts: new Date(),
      interval: '7 days'
    });

    const roomUniqueDayCount = await this.db.rooms.count_period_unique({
      ts: new Date(),
      interval: '1 day'
    });
    const roomUniqueWeekCount = await this.db.rooms.count_period_unique({
      ts: new Date(),
      interval: '7 days'
    });


    request.totalCount = count.count;

    const rooms = await this.db.rooms.reported(params);
    const pagesArr = new Array(Math.ceil(request.totalCount / limit)).fill(0);

    for (const room of rooms) {
      const end = (room.ended_at || new Date(Date.now())).getTime();
      const start = room.created_at.getTime();

      room.duration = Duration(end - start);
    }
    rooms.sort((a, b) => {

      return a.created_at > b.created_at ? -1 : a.created_at < b.created_at ? 1 : 0;
    });

    return h.view('list_of_rooms', {
      pages: pagesArr,
      data: rooms,
      eventClock,
      roomReportClock,
      eventQueue,
      roomReportQueue,
      activeRoomCount: activeCount.count,
      activeSessionCount: sessionCount.count,
      activeMobileSessionCount: sessionMobileCount.count,
      activeDesktopSessionCount: sessionDesktopCount.count,
      prevDayRoomCount: roomDayCount.count,
      prevWeekRoomCount: roomWeekCount.count,
      prevDaySessionCount: sessionDayCount.count,
      prevWeekSessionCount: sessionWeekCount.count,
      prevDayUniqueRoomCount: roomUniqueDayCount.count,
      prevWeekUniqueRoomCount: roomUniqueWeekCount.count,
      prevDayMobileSessionCount: sessionMobileDayCount.count,
      prevWeekMobileSessionCount: sessionMobileWeekCount.count,
      prevDayDesktopSessionCount: sessionDesktopDayCount.count,
      prevWeekDesktopSessionCount: sessionDesktopWeekCount.count
    });
  },
  validate: {
    query: {
      limit: Joi.number().default(25).min(1).max(100),
      page: Joi.number().positive().default(1)
    }
  }
};
