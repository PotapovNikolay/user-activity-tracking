import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { GetUserProfileUseCase } from '../application/use-cases/get-user-profile.use-case';
import { UserProfileResponse } from './dto/user-profile.response';
import { toUserProfileResponse } from './presenters/user-profile.presenter';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly getUserProfileUseCase: GetUserProfileUseCase) {}

  @ApiOperation({ summary: 'Get user profile by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: UserProfileResponse })
  @Get(':id')
  async getUserProfile(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<UserProfileResponse> {
    const user = await this.getUserProfileUseCase.execute(id);
    return toUserProfileResponse(user);
  }
}
