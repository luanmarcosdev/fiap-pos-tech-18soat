const { z } = require('zod');

const idParamDto = z.object({
  id: z.uuid(),
});

module.exports = {
  idParamDto,
};
